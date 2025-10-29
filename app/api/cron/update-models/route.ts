import { NextResponse } from 'next/server';
import { KeyManager } from '@/lib/auth/key-manager';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createDatabaseClient } from '@/lib/database';

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

// 执行维护任务
async function performMaintenanceTasks() {
  const tasks: {
    sharedKeysReset: { status: string; resetCount?: number; error?: string };
    aiMemoryManagement: { status: string; markedCount?: number; refreshedCount?: number; error?: string };
    errors: string[];
  } = {
    sharedKeysReset: { status: 'skipped', resetCount: 0 },
    aiMemoryManagement: { status: 'skipped', markedCount: 0, refreshedCount: 0 },
    errors: []
  };

  try {
    const db = await createDatabaseClient();

    // 1. 重置共享密钥（每日00:00 UTC执行）
    const now = new Date();
    const isResetTime = now.getUTCHours() === 0; // 只在UTC 00:00执行重置

    if (isResetTime) {
      try {
        const resetResult = await db.rpc({ functionName: 'reset_shared_keys_daily' });
        const resetCount = resetResult.data || 0;
        tasks.sharedKeysReset = { status: 'completed', resetCount };
        console.log(`[MAINTENANCE] Reset ${resetCount} shared keys`);
      } catch (error) {
        console.error('[MAINTENANCE] Shared keys reset error:', error);
        tasks.sharedKeysReset = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
        tasks.errors.push(`Shared keys reset: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 2. AI记忆管理（每次都执行）
    try {
      // 标记旧记忆
      const markResult = await db.rpc({ functionName: 'mark_old_ai_memories' });
      let markedCount = 0;
      if (markResult.data) {
        if (Array.isArray(markResult.data)) {
          markedCount = markResult.data[0]?.marked_count || 0;
        } else {
          markedCount = markResult.data.marked_count || 0;
        }
      }

      // 刷新记忆标记
      const refreshResult = await db.rpc({ functionName: 'refresh_ai_memory_markers' });
      let refreshedCount = 0;
      if (refreshResult.data) {
        if (Array.isArray(refreshResult.data)) {
          refreshedCount = refreshResult.data[0]?.refreshed_count || 0;
        } else {
          refreshedCount = refreshResult.data.refreshed_count || 0;
        }
      }

      tasks.aiMemoryManagement = {
        status: 'completed',
        markedCount,
        refreshedCount
      };
      console.log(`[MAINTENANCE] AI Memory: marked ${markedCount}, refreshed ${refreshedCount}`);
    } catch (error) {
      tasks.aiMemoryManagement = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
      tasks.errors.push(`AI memory management: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

  } catch (error) {
    tasks.errors.push(`Database connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return tasks;
}

export async function GET() {
  const keyManager = new KeyManager();

  try {
    // 获取数据库客户端
    const supabaseAdmin = await getSupabaseAdmin()

    // 1. 获取所有活跃的共享Key（限制数量以避免超时）
    const MAX_KEYS_PER_BATCH = 10;
    const { data: activeKeys, error: fetchError } = await supabaseAdmin
      .from('shared_keys')
      .select('id, base_url, api_key_encrypted, available_models, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: true }) // 优先更新最久未更新的
      .limit(MAX_KEYS_PER_BATCH);

    if (fetchError) {
      console.error('Error fetching active keys:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch active keys' }, { status: 500 });
    }

    if (!activeKeys || activeKeys.length === 0) {
      return NextResponse.json({ message: 'No active keys to update.' });
    }

    let updatedCount = 0;
    const errors = [];
    const results = [];

    // 2. 遍历每一个Key，更新模型列表
    for (const key of activeKeys) {
      try {
        const apiKey = keyManager.decryptApiKeyPublic(key.api_key_encrypted);
        // 使用现有的第一个模型进行测试
        const firstModel = key.available_models && key.available_models.length > 0 ? key.available_models[0] : 'gpt-4o';
        const { availableModels } = await keyManager.testApiKey(key.base_url, apiKey, firstModel);

        // 3. 将新的模型列表更新回数据库
        if (availableModels && availableModels.length > 0) {
          const { error: updateError } = await supabaseAdmin
            .from('shared_keys')
            .update({
              available_models: availableModels,
              updated_at: new Date().toISOString()
            })
            .eq('id', key.id);

          if (updateError) {
            console.error(`Error updating models for key ${key.id}:`, updateError);
            errors.push(`Key ${key.id}: ${updateError.message}`);
          } else {
            updatedCount++;
            results.push({
              keyId: key.id,
              baseUrl: key.base_url,
              modelCount: availableModels.length,
              status: 'updated'
            });
          }
        } else {
          results.push({
            keyId: key.id,
            baseUrl: key.base_url,
            status: 'no_models_found'
          });
        }
      } catch (testError) {
        const errorMessage = testError instanceof Error ? testError.message : 'Unknown test error';
        console.error(`Error testing key ${key.id}:`, testError);
        errors.push(`Key ${key.id}: Failed to test - ${errorMessage}`);
        results.push({
          keyId: key.id,
          baseUrl: key.base_url,
          status: 'error',
          error: errorMessage
        });
      }
    }

    // 简化剩余数量计算
    const { count: totalCount } = await supabaseAdmin
      .from('shared_keys')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    const remainingCount = Math.max(0, (totalCount || 0) - activeKeys.length);

    // 执行其他维护任务
    const maintenanceTasks = await performMaintenanceTasks();

    const response: any = {
      message: `Successfully updated ${updatedCount} of ${activeKeys.length} keys.`,
      updatedCount,
      processedKeys: activeKeys.length,
      remainingKeys: remainingCount || 0,
      results,
      batchSize: MAX_KEYS_PER_BATCH,
      maintenance: maintenanceTasks,
      timestamp: new Date().toISOString()
    };

    if (errors.length > 0) {
      response.errors = errors;
      return NextResponse.json(response, { status: 207 }); // Multi-Status
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}