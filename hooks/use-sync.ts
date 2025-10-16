import { useState, useCallback, useEffect, useRef } from 'react';
import { useIndexedDB } from './use-indexed-db';
import { useToast } from './use-toast';
import { useTranslation } from './use-i18n';
import type { DailyLog, AIMemory } from '@/lib/types';
import { useSession } from 'next-auth/react';

// 定义从API返回的日志结构
interface SyncedLog {
  id: string;
  user_id: string;
  date: string;
  log_data: DailyLog;
  last_modified: string;
}

// 🔄 安全合并数组条目的辅助函数
function mergeEntriesByLogId<T extends { log_id: string }>(
  localEntries: T[],
  serverEntries: T[]
): T[] {
  const merged = new Map<string, T>();

  // 先添加本地条目
  localEntries.forEach(entry => {
    if (entry.log_id) {
      merged.set(entry.log_id, entry);
    }
  });

  // 服务器条目覆盖同ID的本地条目
  serverEntries.forEach(entry => {
    if (entry.log_id) {
      merged.set(entry.log_id, entry);
    }
  });

  return Array.from(merged.values());
}

// 🧮 重新计算汇总数据的辅助函数
function recalculateSummary(log: DailyLog): DailyLog['summary'] {
  let totalCaloriesConsumed = 0
  let totalCarbs = 0
  let totalProtein = 0
  let totalFat = 0
  let totalCaloriesBurned = 0
  const micronutrients: Record<string, number> = {}

  log.foodEntries?.forEach((entry) => {
    if (entry.total_nutritional_info_consumed) {
      totalCaloriesConsumed += entry.total_nutritional_info_consumed.calories || 0
      totalCarbs += entry.total_nutritional_info_consumed.carbohydrates || 0
      totalProtein += entry.total_nutritional_info_consumed.protein || 0
      totalFat += entry.total_nutritional_info_consumed.fat || 0
      Object.entries(entry.total_nutritional_info_consumed).forEach(([key, value]) => {
        if (!["calories", "carbohydrates", "protein", "fat"].includes(key) && typeof value === "number") {
          micronutrients[key] = (micronutrients[key] || 0) + value
        }
      })
    }
  })

  log.exerciseEntries?.forEach((entry) => {
    totalCaloriesBurned += entry.calories_burned_estimated || 0
  })

  return {
    totalCaloriesConsumed,
    totalCaloriesBurned,
    macros: { carbs: totalCarbs, protein: totalProtein, fat: totalFat },
    micronutrients,
  }
}

// 🧹 数组去重工具函数，确保逻辑删除 ID 不会重复保存
function uniqArray<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export const useSync = () => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const {
    getAllData,
    saveData,
    batchSave,
    getData,
    deleteData,
    isInitializing: healthLogsInitializing,
    waitForInitialization: waitForHealthLogsInit
  } = useIndexedDB("healthLogs");

  const {
    getAllData: getAllMemories,
    saveData: saveMemory,
    batchSave: batchSaveMemories,
    isInitializing: memoriesInitializing,
    waitForInitialization: waitForMemoriesInit
  } = useIndexedDB("aiMemories");

  const { toast } = useToast();
  const t = useTranslation('sync');

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncProgress, setSyncProgress] = useState<{
    logs: boolean;
    memories: boolean;
    profile: boolean;
  }>({ logs: false, memories: false, profile: false });

  // 同步节流配置
  const SYNC_THROTTLE_MINUTES = 5; // 自动同步间隔：5分钟
  const SESSION_SYNC_KEY = 'lastAutoSyncTime';
  const STORAGE_SYNC_KEY = 'lastSyncTimestamp';

  const isSyncingRef = useRef(isSyncing);
  isSyncingRef.current = isSyncing;

  // 检查是否需要自动同步
  const shouldAutoSync = useCallback(() => {
    // 检查是否在客户端环境
    if (typeof window === 'undefined') {
      return false;
    }

    // 检查会话存储 - 如果这个会话已经同步过，就不再同步
    const sessionSyncTime = sessionStorage.getItem(SESSION_SYNC_KEY);
    if (sessionSyncTime) {
      //console.log('[Sync] Already synced in this session, skipping auto sync');
      return false;
    }

    // 检查本地存储 - 如果距离上次同步时间太短，就不同步
    const lastSyncStr = localStorage.getItem(STORAGE_SYNC_KEY);
    if (lastSyncStr) {
      const lastSyncTime = new Date(lastSyncStr);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);

      if (diffMinutes < SYNC_THROTTLE_MINUTES) {
        console.log(`[Sync] Last sync was ${diffMinutes.toFixed(1)} minutes ago, skipping auto sync (threshold: ${SYNC_THROTTLE_MINUTES} minutes)`);
        return false;
      }
    }

    return true;
  }, [SYNC_THROTTLE_MINUTES, SESSION_SYNC_KEY, STORAGE_SYNC_KEY]);

  // 记录同步时间
  const recordSyncTime = useCallback(() => {
    if (typeof window === 'undefined') return;

    const now = new Date().toISOString();
    sessionStorage.setItem(SESSION_SYNC_KEY, now);
    localStorage.setItem(STORAGE_SYNC_KEY, now);
  }, [SESSION_SYNC_KEY, STORAGE_SYNC_KEY]);

  // 清除节流状态（用于测试或强制同步）
  const clearThrottleState = useCallback(() => {
    if (typeof window === 'undefined') return;

    sessionStorage.removeItem(SESSION_SYNC_KEY);
    localStorage.removeItem(STORAGE_SYNC_KEY);
    console.log('[Sync] Throttle state cleared');
  }, [SESSION_SYNC_KEY, STORAGE_SYNC_KEY]);

  const pullData = useCallback(async (isPartOfFullSync = false) => {
    if (!userId) {
      console.log("[Sync] User not logged in, skipping pull.");
      return;
    }
    if (!isPartOfFullSync && isSyncingRef.current) return;

    try {
      // 等待数据库初始化完成
      await waitForHealthLogsInit().catch(err => {
        console.error("[Sync] Failed to initialize IndexedDB for health logs:", err);
        throw new Error("数据库初始化失败，请刷新页面重试");
      });

      console.log("[Sync] Starting data pull from cloud...");
      if (!isPartOfFullSync) setIsSyncing(true);

      const response = await fetch('/api/sync/logs');

      if (response.status === 401) {
        toast({ title: t('error.unauthorized.title'), description: t('error.unauthorized.description'), variant: 'destructive' });
        return;
      }
      if (!response.ok) {
        throw new Error(t('error.pullFailed'));
      }

      const serverLogs: SyncedLog[] = await response.json();
      if (serverLogs.length === 0) {
        console.log('[Sync] No logs found in the cloud.');
        return;
      }

      console.log(`[Sync] Fetched ${serverLogs.length} logs from the cloud. Comparing with local data...`);

      const localLogs = await getAllData();
      const localLogsMap = new Map(localLogs.map((log: DailyLog) => [log.date, log]));
      const logsToUpdate: DailyLog[] = [];

      for (const serverLog of serverLogs) {
        const localLog = localLogsMap.get(serverLog.date);

        // 检查本地日志是否为空（没有实际条目）
        const isLocalLogEffectivelyEmpty =
          !localLog ||
          ((localLog.foodEntries?.length || 0) === 0 && (localLog.exerciseEntries?.length || 0) === 0);

        // 🧠 智能合并策略：避免数据丢失
        if (isLocalLogEffectivelyEmpty) {
          // 本地为空，直接使用服务器数据
          const logDataFromServer = serverLog.log_data as Partial<DailyLog>;
          // 🔧 修复日期格式：确保使用本地时区的 yyyy-MM-dd 格式
          const serverDate = new Date(serverLog.date);
          const normalizedDate = `${serverDate.getFullYear()}-${String(serverDate.getMonth() + 1).padStart(2, '0')}-${String(serverDate.getDate()).padStart(2, '0')}`;
          console.log(`[Sync] Date normalization: ${serverLog.date} → ${normalizedDate} (local timezone)`);
          const purifiedLog: DailyLog = {
            foodEntries: [],
            exerciseEntries: [],
            summary: {
              totalCaloriesConsumed: 0,
              totalCaloriesBurned: 0,
              macros: { carbs: 0, protein: 0, fat: 0 },
              micronutrients: {}
            },
            dailyStatus: {
              stress: 3,
              mood: 3,
              health: 3,
              bedTime: "23:00",
              wakeTime: "07:00",
              sleepQuality: 3,
            },
            ...logDataFromServer,
            date: normalizedDate, // 使用标准化的日期格式
          };
          logsToUpdate.push(purifiedLog);
        } else if (new Date(serverLog.last_modified) >= new Date(localLog.last_modified || 0)) {
          // 服务器版本更新或相同时间戳但数据不同，需要检查和合并
          const serverFoodCount = serverLog.log_data?.foodEntries?.length || 0;
          const localFoodCount = localLog.foodEntries?.length || 0;
          const serverExerciseCount = serverLog.log_data?.exerciseEntries?.length || 0;
          const localExerciseCount = localLog.exerciseEntries?.length || 0;

          // 检查是否真的需要更新（时间戳更新 或 数据内容不同）
          const timestampNewer = new Date(serverLog.last_modified) > new Date(localLog.last_modified || 0);
          const dataContentDifferent = serverFoodCount !== localFoodCount || serverExerciseCount !== localExerciseCount;

          if (timestampNewer || dataContentDifferent) {
            console.log(`[Sync] Server data needs sync for ${serverLog.date}:`);
            console.log(`[Sync] Server timestamp: ${serverLog.last_modified}`);
            console.log(`[Sync] Local timestamp: ${localLog.last_modified || 'none'}`);
            console.log(`[Sync] Server food entries: ${serverFoodCount}`);
            console.log(`[Sync] Local food entries: ${localFoodCount}`);
            console.log(`[Sync] Server exercise entries: ${serverExerciseCount}`);
            console.log(`[Sync] Local exercise entries: ${localExerciseCount}`);
            console.log(`[Sync] Reason: ${timestampNewer ? 'timestamp newer' : 'data content different'}`);

            const serverData = serverLog.log_data as Partial<DailyLog>;

          // 🔄 安全合并数组：基于 log_id 去重合并
          const mergedFoodEntries = mergeEntriesByLogId(
            localLog.foodEntries || [],
            serverData.foodEntries || []
          );

          const mergedExerciseEntries = mergeEntriesByLogId(
            localLog.exerciseEntries || [],
            serverData.exerciseEntries || []
          );

            // 🔧 修复日期格式：确保使用本地时区的 yyyy-MM-dd 格式
            const serverDate = new Date(serverLog.date);
            const normalizedDate = `${serverDate.getFullYear()}-${String(serverDate.getMonth() + 1).padStart(2, '0')}-${String(serverDate.getDate()).padStart(2, '0')}`;
            console.log(`[Sync] Date normalization: ${serverLog.date} → ${normalizedDate} (local timezone)`);
            const mergedLog: DailyLog = {
              ...localLog, // 保留本地数据作为基础
              ...serverData, // 服务器数据覆盖
              foodEntries: mergedFoodEntries, // 使用合并后的数组
              exerciseEntries: mergedExerciseEntries, // 使用合并后的数组
              date: normalizedDate, // 使用标准化的日期格式
              last_modified: serverLog.last_modified, // 使用服务器时间戳
            };

            logsToUpdate.push(mergedLog);
          } else {
            console.log(`[Sync] No sync needed for ${serverLog.date} - data is identical`);
          }
        }
      }

      if (logsToUpdate.length > 0) {
        console.log(`[Sync] Updating ${logsToUpdate.length} local logs with newer data from the cloud.`);
        console.log(`[Sync] Logs to update:`, logsToUpdate);

        // 过滤已删除的条目后再保存
        const filteredLogs = logsToUpdate.map(log => {
          const filteredLog = { ...log };

          // 过滤已删除的食物条目
          if (filteredLog.foodEntries && filteredLog.deletedFoodIds) {
            filteredLog.foodEntries = filteredLog.foodEntries.filter(
              entry => !filteredLog.deletedFoodIds?.includes(entry.log_id)
            );
          }

          // 过滤已删除的运动条目
          if (filteredLog.exerciseEntries && filteredLog.deletedExerciseIds) {
            filteredLog.exerciseEntries = filteredLog.exerciseEntries.filter(
              entry => !filteredLog.deletedExerciseIds?.includes(entry.log_id)
            );
          }

          return filteredLog;
        });

        console.log(`[Sync] About to save ${filteredLogs.length} filtered logs to IndexedDB...`);
        console.log(`[Sync] Filtered logs summary:`, filteredLogs.map(log => ({
          date: log.date,
          foodEntries: log.foodEntries?.length || 0,
          exerciseEntries: log.exerciseEntries?.length || 0,
          last_modified: log.last_modified
        })));

        await batchSave(filteredLogs);
        console.log(`[Sync] Successfully saved logs to IndexedDB (with deleted entries filtered)`);

        // 🔍 验证数据是否真的保存了
        console.log(`[Sync] Verifying saved data...`);
        for (const log of filteredLogs) {
          try {
            const savedLog = await getData(log.date);
            if (savedLog) {
              console.log(`[Sync] Verified data for ${log.date}: food=${savedLog.foodEntries?.length || 0}, exercise=${savedLog.exerciseEntries?.length || 0}`);
            } else {
              console.error(`[Sync] Failed to verify data for ${log.date}: no data found after save!`);
            }
          } catch (verifyError) {
            console.error(`[Sync] Failed to verify data for ${log.date}:`, verifyError);
          }
        }

        // 🔄 触发数据刷新事件，确保UI及时更新
        const updatedDates = new Set(logsToUpdate.map(log => log.date));
        updatedDates.forEach(date => {
          console.log(`[Sync] Scheduling UI refresh for date: ${date}`);
          // 使用 setTimeout 0，确保组件已完成 useEffect 挂载后再触发事件，避免事件丢失
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('forceDataRefresh', {
              detail: { date, source: 'cloudSync' }
            }));
          }, 0);
        });

        // 只在手动同步时显示toast，完整同步时静默处理
        if (!isPartOfFullSync) {
          toast({ title: t('success.pullTitle'), description: t('success.pullDescription', { count: logsToUpdate.length }) });
        }
      } else {
        console.log('[Sync] Local data is up to date.');
      }

      if (!isPartOfFullSync) setLastSynced(new Date());
    } catch (error) {
      console.error('[Sync] Pull error:', error);
      if (!isPartOfFullSync) {
        toast({ title: t('error.pullTitle'), description: (error as Error).message, variant: 'destructive' });
      }
      throw error; // 重新抛出错误，让调用者处理
    } finally {
      if (!isPartOfFullSync) setIsSyncing(false);
    }
  }, [userId, getAllData, batchSave, toast, t, waitForHealthLogsInit]);

  const pushData = useCallback(async (date: string, patch: Partial<DailyLog>) => {
    if (!userId) {
        console.log("[Sync] User not logged in, skipping push.");
        return;
    }

    try {
      // 等待数据库初始化完成
      await waitForHealthLogsInit().catch(err => {
        console.error("[Sync] Failed to initialize IndexedDB for health logs:", err);
        throw new Error("数据库初始化失败，请刷新页面重试");
      });

      console.log(`[Sync] Starting partial data push to cloud for date: ${date}`);

      // 1. 从本地获取当前日期的完整日志
      const currentLog = await getData(date) || { date, last_modified: null };
      console.log(`[Sync] Current log for ${date}:`, currentLog);

      // 2. 记录基于的版本时间戳（用于乐观锁检查）
      const basedOnModified = currentLog.last_modified;
      console.log(`[Sync] Based on version timestamp:`, basedOnModified);

      // 3. 创建新的时间戳并合并补丁到当前日志
      const newTimestamp = new Date().toISOString();
      const newLogData = {
        ...currentLog,
        ...patch,
        last_modified: newTimestamp,
      };
      console.log(`[Sync] New log data after patch:`, newLogData);

      // 4. 将完整的最新日志保存回本地
      console.log(`[Sync] Saving updated log to IndexedDB...`);
      await saveData(date, newLogData);
      console.log(`[Sync] Successfully saved to IndexedDB`);

      // 5. 准备包含补丁和版本信息的API负载
      const apiPayload = {
        date: date,
        log_data_patch: patch, // 发送补丁而不是整个对象
        last_modified: newTimestamp, // 新的时间戳
        based_on_modified: basedOnModified, // 基于的版本时间戳（用于冲突检测）
      };
      console.log(`[Sync] API payload:`, apiPayload);

      console.log(`[Sync] Sending patch to cloud...`);
      const response = await fetch('/api/sync/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([apiPayload]), // API需要一个数组
      });
      console.log(`[Sync] API response status:`, response.status);

      if (response.status === 401) {
        toast({ title: t('error.unauthorized.title'), description: t('error.unauthorized.description'), variant: 'destructive' });
        return;
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('error.pushFailed'));
      }

      console.log(`[Sync] Successfully pushed partial data for date: ${date}`);
      // 不更新lastSynced，因为这不是完整同步
      // setLastSynced(new Date());

    } catch (error) {
      console.error('[Sync] Push error:', error);
      toast({ title: t('error.pushTitle'), description: (error as Error).message, variant: 'destructive' });
    }
    // 不需要finally块，因为我们没有设置全局同步状态
  }, [userId, getData, saveData, toast, t, waitForHealthLogsInit]);

  // AI记忆同步功能
  const pullMemories = useCallback(async (isPartOfFullSync = false) => {
    if (!userId) {
      console.log("[Sync] User not logged in, skipping memories pull.");
      return;
    }

    try {
      // 等待数据库初始化完成
      await waitForMemoriesInit().catch(err => {
        console.error("[Sync] Failed to initialize IndexedDB for memories:", err);
        throw new Error("AI记忆数据库初始化失败，请刷新页面重试");
      });

      console.log("[Sync] Starting AI memories pull from cloud...");

      const response = await fetch('/api/sync/memories');

      if (response.status === 401) {
        toast({ title: t('error.unauthorized.title'), description: t('error.unauthorized.description'), variant: 'destructive' });
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch AI memories');
      }

      const serverMemories: Record<string, AIMemory> = await response.json();
      const memoryCount = Object.keys(serverMemories).length;

      if (memoryCount === 0) {
        console.log('[Sync] No AI memories found in the cloud.');
        return;
      }

      console.log(`[Sync] Fetched ${memoryCount} AI memories from the cloud.`);

      // 批量保存到本地IndexedDB
      const memoriesToSave: Array<{ key: string; value: AIMemory }> = [];
      Object.entries(serverMemories).forEach(([expertId, memory]) => {
        memoriesToSave.push({ key: expertId, value: memory });
      });

      // 使用批量保存（如果支持）或逐个保存
      console.log(`[Sync] Saving ${memoriesToSave.length} memories to IndexedDB...`);
      for (const { key, value } of memoriesToSave) {
        console.log(`[Sync] Saving memory for expert: ${key}`, value);
        try {
          await saveMemory(key, value);
          console.log(`[Sync] Successfully saved memory for expert: ${key}`);
        } catch (error) {
          console.error(`[Sync] Failed to save memory for expert: ${key}`, error);
          throw error;
        }
      }
      console.log(`[Sync] Successfully saved all memories to IndexedDB`);

      // 只在手动同步时显示toast
      if (!isPartOfFullSync) {
        toast({
          title: t('success.pullTitle'),
          description: `Successfully synced ${memoryCount} AI memories`
        });
      }

    } catch (error) {
      console.error('[Sync] Memories pull error:', error);
      if (!isPartOfFullSync) {
        toast({
          title: t('error.pullTitle'),
          description: (error as Error).message,
          variant: 'destructive'
        });
      }
      throw error;
    }
  }, [userId, getAllMemories, saveMemory, toast, t, waitForMemoriesInit]);

  const pushMemories = useCallback(async () => {
    if (!userId) {
      console.log("[Sync] User not logged in, skipping memories push.");
      return;
    }

    console.log("[Sync] Starting AI memories push to cloud...");

    try {
      // 获取所有本地AI记忆
      const localMemories = await getAllMemories();

      if (localMemories.length === 0) {
        console.log('[Sync] No local AI memories to sync.');
        return;
      }

      // 转换为API期望的格式
      const memoriesToSync: Record<string, any> = {};
      localMemories.forEach((memory: AIMemory) => {
        memoriesToSync[memory.expertId] = {
          content: memory.content,
          version: memory.version,
          lastUpdated: memory.lastUpdated
        };
      });

      const response = await fetch('/api/sync/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memoriesToSync),
      });

      if (response.status === 401) {
        toast({ title: t('error.unauthorized.title'), description: t('error.unauthorized.description'), variant: 'destructive' });
        return;
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync AI memories');
      }

      const result = await response.json();
      console.log(`[Sync] Successfully pushed ${result.count || localMemories.length} AI memories`);

      toast({
        title: t('success.pushTitle'),
        description: `Successfully synced ${result.count || localMemories.length} AI memories`
      });

    } catch (error) {
      console.error('[Sync] AI memories push error:', error);
      toast({
        title: t('error.pushTitle'),
        description: (error as Error).message,
        variant: 'destructive'
      });
    }
  }, [userId, getAllMemories, toast, t]);

  // 🗑️ 安全删除条目函数
  const removeEntry = useCallback(async (
    date: string,
    entryType: 'food' | 'exercise',
    logId: string
  ) => {
    if (!userId) {
      console.log("[Sync] User not logged in, skipping remove.");
      return;
    }

    console.log(`[Sync] Removing ${entryType} entry ${logId} for date: ${date}`);

    // 保存原始数据用于回滚
    let originalLog: any = null;

    try {
      // 1. 从本地获取并备份原始数据
      originalLog = await getData(date);
      if (!originalLog) {
        console.log(`[Sync] No log found for date: ${date}`);
        return;
      }

      // originalLog 已经是原始数据的引用，用于回滚

      let updated = false;
      const updatedLog = { ...originalLog };

      if (entryType === 'food') {
        const originalLength = updatedLog.foodEntries?.length || 0;
        updatedLog.foodEntries = updatedLog.foodEntries?.filter((entry: { log_id: string }) => entry.log_id !== logId) || [];
        updated = updatedLog.foodEntries.length !== originalLength;
      } else {
        const originalLength = updatedLog.exerciseEntries?.length || 0;
        updatedLog.exerciseEntries = updatedLog.exerciseEntries?.filter((entry: { log_id: string }) => entry.log_id !== logId) || [];
        updated = updatedLog.exerciseEntries.length !== originalLength;
      }

      if (!updated) {
        console.log(`[Sync] Entry ${logId} not found in local data`);
        return;
      }

      // 2. 乐观更新：立即更新本地数据和UI，并添加到删除列表
      updatedLog.last_modified = new Date().toISOString();

      // 添加到逻辑删除列表
      if (entryType === 'food') {
        updatedLog.deletedFoodIds = updatedLog.deletedFoodIds || [];
        if (!updatedLog.deletedFoodIds.includes(logId)) {
          updatedLog.deletedFoodIds.push(logId);
        }
        // ✨ 去重，确保没有重复 ID
        updatedLog.deletedFoodIds = uniqArray(updatedLog.deletedFoodIds);
      } else {
        updatedLog.deletedExerciseIds = updatedLog.deletedExerciseIds || [];
        if (!updatedLog.deletedExerciseIds.includes(logId)) {
          updatedLog.deletedExerciseIds.push(logId);
        }
        // ✨ 去重，确保没有重复 ID
        updatedLog.deletedExerciseIds = uniqArray(updatedLog.deletedExerciseIds);
      }

      // 🔄 重新计算汇总数据
      updatedLog.summary = recalculateSummary(updatedLog);

      await saveData(date, updatedLog);

      // 3. 通过同步机制推送删除操作（包含逻辑删除信息和重新计算的汇总）
      const deletePatch: Partial<DailyLog> = {
        [entryType === 'food' ? 'foodEntries' : 'exerciseEntries']: updatedLog[entryType === 'food' ? 'foodEntries' : 'exerciseEntries'],
        [entryType === 'food' ? 'deletedFoodIds' : 'deletedExerciseIds']: updatedLog[entryType === 'food' ? 'deletedFoodIds' : 'deletedExerciseIds'],
        summary: updatedLog.summary // 🔄 包含重新计算的汇总数据
      };

      // 使用现有的 pushData 机制而不是专门的删除API
      await pushData(date, deletePatch);

      console.log(`[Sync] Successfully removed ${entryType} entry ${logId} using logical deletion`);

      // 🔄 触发UI刷新以反映删除操作
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('forceDataRefresh', { detail: { date } }));
      }, 0);

    } catch (error) {
      console.error('[Sync] Remove entry error:', error);

      // 🔄 回滚本地更改
      if (originalLog) {
        try {
          console.log(`[Sync] Rolling back local changes for ${date}`);
          await saveData(date, originalLog);

          // 触发UI刷新以显示回滚后的数据
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('forceDataRefresh', { detail: { date } }));
          }, 0);

          console.log(`[Sync] Successfully rolled back local changes`);
        } catch (rollbackError) {
          console.error('[Sync] Failed to rollback local changes:', rollbackError);
        }
      }

      toast({
        title: 'Delete Failed',
        description: `${(error as Error).message}. Changes have been reverted.`,
        variant: 'destructive'
      });
    }
  }, [userId, getData, saveData, deleteData, pullData, toast, t]);

  // 用户档案同步功能
  const pullProfile = useCallback(async (isPartOfFullSync = false) => {
    if (!userId) {
      console.log("[Sync] User not logged in, skipping profile pull.");
      return;
    }

    console.log("[Sync] Starting profile pull from cloud...");

    try {
      const response = await fetch('/api/sync/profile');

      if (response.status === 401) {
        toast({ title: t('error.unauthorized.title'), description: t('error.unauthorized.description'), variant: 'destructive' });
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const serverProfile = await response.json();

      if (Object.keys(serverProfile).length === 0) {
        console.log('[Sync] No profile found in the cloud.');
        return;
      }

      // 保存到localStorage
      localStorage.setItem('userProfile', JSON.stringify(serverProfile));

      console.log('[Sync] Successfully synced profile from cloud.');
      // 只在手动同步时显示toast
      if (!isPartOfFullSync) {
        toast({
          title: t('success.pullTitle'),
          description: 'Successfully synced profile'
        });
      }

    } catch (error) {
      console.error('[Sync] Profile pull error:', error);
      if (!isPartOfFullSync) {
        toast({
          title: t('error.pullTitle'),
          description: (error as Error).message,
          variant: 'destructive'
        });
      }
      throw error; // 重新抛出错误，让调用者处理
    }
  }, [userId, toast, t]);

  const pushProfile = useCallback(async () => {
    if (!userId) {
      console.log("[Sync] User not logged in, skipping profile push.");
      return;
    }

    console.log("[Sync] Starting profile push to cloud...");

    try {
      // 获取本地用户档案
      const localProfileStr = localStorage.getItem('userProfile');

      if (!localProfileStr) {
        console.log('[Sync] No local profile to sync.');
        return;
      }

      const localProfile = JSON.parse(localProfileStr);

      const response = await fetch('/api/sync/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localProfile),
      });

      if (response.status === 401) {
        toast({ title: t('error.unauthorized.title'), description: t('error.unauthorized.description'), variant: 'destructive' });
        return;
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync profile');
      }

      const result = await response.json();
      console.log('[Sync] Successfully pushed profile to cloud');

      // 更新本地档案的lastUpdated时间戳
      if (result.lastUpdated) {
        const updatedProfile = { ...localProfile, lastUpdated: result.lastUpdated };
        localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      }

      toast({
        title: t('success.pushTitle'),
        description: 'Successfully synced profile'
      });

    } catch (error) {
      console.error('[Sync] Profile push error:', error);
      toast({
        title: t('error.pushTitle'),
        description: (error as Error).message,
        variant: 'destructive'
      });
    }
  }, [userId, toast, t]);

  // 完整同步功能
  const syncAll = useCallback(async (isManual = false) => {
    if (!userId || isSyncingRef.current) return;

    // 如果是自动同步，检查是否需要节流
    if (!isManual && !shouldAutoSync()) {
      return;
    }

    console.log(`[Sync] Starting ${isManual ? 'manual' : 'auto'} full sync...`);
    setIsSyncing(true);

    // 重置同步进度
    setSyncProgress({ logs: false, memories: false, profile: false });

    try {
      // 初始化数据库
      await Promise.all([
        waitForHealthLogsInit().catch(err => {
          console.error("[Sync] Failed to initialize IndexedDB for health logs:", err);
        }),
        waitForMemoriesInit().catch(err => {
          console.error("[Sync] Failed to initialize IndexedDB for memories:", err);
        })
      ]);

      // 并行执行所有拉取操作，传递isPartOfFullSync=true参数
      const syncPromises = [
        pullData(true).then(() => setSyncProgress(prev => ({ ...prev, logs: true }))),
        pullMemories(true).then(() => setSyncProgress(prev => ({ ...prev, memories: true }))),
        pullProfile(true).then(() => setSyncProgress(prev => ({ ...prev, profile: true })))
      ];

      await Promise.all(syncPromises);

      const now = new Date();
      setLastSynced(now);

      // 记录同步时间（用于节流）
      recordSyncTime();

      console.log(`[Sync] ${isManual ? 'Manual' : 'Auto'} full sync completed successfully`);

      // 只在手动同步时显示成功提示
      if (isManual) {
        toast({
          title: t('success.syncTitle') || '同步成功',
          description: '所有数据已成功同步',
          variant: 'default'
        });
      }

    } catch (error) {
      console.error('[Sync] Full sync error:', error);
      toast({
        title: t('error.syncTitle'),
        description: (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  }, [userId, pullData, pullMemories, pullProfile, toast, t, waitForHealthLogsInit, waitForMemoriesInit]);

  // 在用户登录后，自动执行一次完整同步（带节流）
  useEffect(() => {
    if (userId) {
      // 添加防抖，避免快速重复调用
      const timeoutId = setTimeout(() => {
        syncAll(false); // isManual = false，表示自动同步
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [userId, syncAll]);

  // 初始化时从localStorage读取上次同步时间
  useEffect(() => {
    const lastSyncStr = localStorage.getItem(STORAGE_SYNC_KEY);
    if (lastSyncStr) {
      setLastSynced(new Date(lastSyncStr));
    }
  }, [STORAGE_SYNC_KEY]);

  return {
    isSyncing,
    lastSynced,
    syncProgress,
    pushData,
    pullData,
    pushMemories,
    pullMemories,
    pushProfile,
    pullProfile,
    syncAll,
    removeEntry, // 🗑️ 新增：安全删除条目
    shouldAutoSync, // 暴露给外部使用
    clearThrottleState, // 暴露清除节流状态的功能
    SYNC_THROTTLE_MINUTES // 暴露节流时间配置
  };
};