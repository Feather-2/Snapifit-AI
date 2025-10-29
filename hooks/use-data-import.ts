import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/components/ui/use-toast'
import { DB_NAME, DB_VERSION } from '@/lib/config/database'

interface ImportProgress {
  stage: 'parsing' | 'local' | 'cloud' | 'complete' | 'error'
  message: string
  progress: number
}

interface ImportResult {
  success: boolean
  localSuccess: boolean
  cloudSuccess: boolean
  error?: string
}

// 验证导入数据的结构
function validateImportData(data: any): { isValid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid data format. Expected JSON object.' }
  }

  if (!data.userProfile) {
    return { isValid: false, error: 'Missing user profile data.' }
  }

  if (!data.healthLogs || typeof data.healthLogs !== 'object') {
    return { isValid: false, error: 'Missing or invalid health logs data.' }
  }

  // 验证健康日志的基本结构
  const logEntries = Object.entries(data.healthLogs)
  if (logEntries.length === 0) {
    return { isValid: false, error: 'No health logs found in the data.' }
  }

  // 验证日期格式
  for (const [date, logData] of logEntries) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { isValid: false, error: `Invalid date format: ${date}. Expected YYYY-MM-DD.` }
    }

    if (!logData || typeof logData !== 'object') {
      return { isValid: false, error: `Invalid log data for date: ${date}` }
    }
  }

  return { isValid: true }
}

export function useDataImport() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)

  const importData = useCallback(async (
    file: File,
    setUserProfile: (profile: any) => void,
    setAIConfig: (config: any) => void,
    t: (key: string) => string
  ): Promise<ImportResult> => {
    setIsImporting(true)
    setImportProgress({
      stage: 'parsing',
      message: t('data.importInProgress'),
      progress: 10
    })

    try {
      // 1. 解析文件
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = () => reject(new Error('File read failed'))
        reader.readAsText(file)
      })

      let importedData: any
      try {
        importedData = JSON.parse(content)
      } catch (parseError) {
        throw new Error('Invalid JSON format. Please check your file.')
      }

      // 验证数据结构
      const validation = validateImportData(importedData)
      if (!validation.isValid) {
        throw new Error(validation.error || t('data.importErrorDescription'))
      }

      console.log('[Import] Data validation passed:', {
        userProfile: !!importedData.userProfile,
        healthLogs: Object.keys(importedData.healthLogs).length,
        aiMemories: importedData.aiMemories ? Object.keys(importedData.aiMemories).length : 0,
        aiConfig: !!importedData.aiConfig
      })

      setImportProgress({
        stage: 'local',
        message: '正在更新本地数据...',
        progress: 30
      })

      // 2. 更新本地状态
      setUserProfile(importedData.userProfile)
      if (importedData.aiConfig) {
        setAIConfig(importedData.aiConfig)
      }

      // 3. 更新本地IndexedDB
      await new Promise<void>((resolve, reject) => {
        const dbOpenRequest = window.indexedDB.open(DB_NAME, DB_VERSION)

        dbOpenRequest.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains("healthLogs")) {
            db.createObjectStore("healthLogs")
          }
          if (!db.objectStoreNames.contains("aiMemories")) {
            db.createObjectStore("aiMemories")
          }
        }

        dbOpenRequest.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          const transaction = db.transaction(["healthLogs", "aiMemories"], "readwrite")
          const healthLogsStore = transaction.objectStore("healthLogs")
          const aiMemoriesStore = transaction.objectStore("aiMemories")

          // 清空并重新添加健康日志
          healthLogsStore.clear().onsuccess = () => {
            Object.entries(importedData.healthLogs).forEach(([key, value]) => {
              healthLogsStore.add(value, key)
            })
          }

          // 清空并重新添加AI记忆
          if (importedData.aiMemories) {
            aiMemoriesStore.clear().onsuccess = () => {
              Object.entries(importedData.aiMemories).forEach(([key, value]) => {
                aiMemoriesStore.add(value, key)
              })
            }
          }

          transaction.oncomplete = () => resolve()
          transaction.onerror = () => reject(new Error('IndexedDB transaction failed'))
        }

        dbOpenRequest.onerror = () => reject(new Error('IndexedDB open failed'))
      })

      setImportProgress({
        stage: 'cloud',
        message: '正在同步到云端...',
        progress: 60
      })

      let cloudSuccess = true
      let cloudError: string | undefined

      // 4. 云端同步（如果已登录）
      if (session?.user?.id) {
        try {
          console.log('[Import] Starting cloud sync for user:', session.user.id)

          // 同步用户档案
          console.log('[Import] Syncing user profile...')
          const profileResponse = await fetch('/api/sync/profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(importedData.userProfile)
          })

          if (!profileResponse.ok) {
            const errorData = await profileResponse.json().catch(() => ({}))
            console.error('[Import] Profile sync failed:', profileResponse.status, errorData)

            // 特殊处理认证错误
            if (profileResponse.status === 401) {
              throw new Error('Authentication failed. Please log in again.')
            }

            throw new Error(`Profile sync failed: ${profileResponse.status} - ${errorData.error || 'Unknown error'}`)
          }
          console.log('[Import] Profile sync completed')

          setImportProgress({
            stage: 'cloud',
            message: '正在同步健康日志...',
            progress: 75
          })

          // 同步健康日志
          const logsToSync = Object.entries(importedData.healthLogs).map(([date, logData]) => ({
            date,
            log_data: logData,
            last_modified: new Date().toISOString()
          }))

          if (logsToSync.length > 0) {
            console.log(`[Import] Syncing ${logsToSync.length} health logs...`)
            const logsResponse = await fetch('/api/sync/logs', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(logsToSync)
            })

            if (!logsResponse.ok) {
              const errorData = await logsResponse.json().catch(() => ({}))
              console.error('[Import] Logs sync failed:', logsResponse.status, errorData)

              if (logsResponse.status === 401) {
                throw new Error('Authentication failed. Please log in again.')
              }

              throw new Error(`Logs sync failed: ${logsResponse.status} - ${errorData.error || 'Unknown error'}`)
            }
            console.log('[Import] Health logs sync completed')
          } else {
            console.log('[Import] No health logs to sync')
          }

          setImportProgress({
            stage: 'cloud',
            message: '正在同步AI记忆...',
            progress: 90
          })

          // 同步AI记忆
          if (importedData.aiMemories && Object.keys(importedData.aiMemories).length > 0) {
            console.log(`[Import] Syncing ${Object.keys(importedData.aiMemories).length} AI memories...`)
            const memoriesResponse = await fetch('/api/sync/memories', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(importedData.aiMemories)
            })

            if (!memoriesResponse.ok) {
              const errorData = await memoriesResponse.json().catch(() => ({}))
              console.error('[Import] Memories sync failed:', memoriesResponse.status, errorData)

              if (memoriesResponse.status === 401) {
                throw new Error('Authentication failed. Please log in again.')
              }

              throw new Error(`Memories sync failed: ${memoriesResponse.status} - ${errorData.error || 'Unknown error'}`)
            }
            console.log('[Import] AI memories sync completed')
          } else {
            console.log('[Import] No AI memories to sync')
          }

          console.log('[Import] Cloud sync completed successfully')
        } catch (error) {
          console.error('[Import] Cloud sync failed:', error)
          cloudSuccess = false
          cloudError = error instanceof Error ? error.message : 'Unknown cloud sync error'
        }
      } else {
        console.log('[Import] User not logged in, skipping cloud sync')
        cloudSuccess = false
        cloudError = 'User not logged in'
      }

      setImportProgress({
        stage: 'complete',
        message: cloudSuccess ? '导入并同步完成' : '导入完成，同步失败',
        progress: 100
      })

      // 显示结果提示
      if (cloudSuccess) {
        toast({
          title: t('data.importSuccessTitle'),
          description: t('data.importSuccessWithSyncDesc'),
        })
      } else {
        toast({
          title: t('data.importPartialSuccessTitle'),
          description: t('data.importPartialSuccessDesc'),
          variant: "destructive",
        })
      }

      return {
        success: true,
        localSuccess: true,
        cloudSuccess,
        error: cloudError
      }

    } catch (error) {
      console.error("Import data failed:", error)

      setImportProgress({
        stage: 'error',
        message: '导入失败',
        progress: 0
      })

      toast({
        title: t('data.importErrorTitle'),
        description: error instanceof Error ? error.message : t('data.importErrorDescription'),
        variant: "destructive",
      })

      return {
        success: false,
        localSuccess: false,
        cloudSuccess: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    } finally {
      setIsImporting(false)
      // 清除进度状态
      setTimeout(() => setImportProgress(null), 3000)
    }
  }, [session, toast])

  return {
    importData,
    isImporting,
    importProgress
  }
}
