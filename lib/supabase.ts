import { createClient } from '@supabase/supabase-js'
import { getVersion } from '../config/features'

// 从环境变量获取数据库提供商
const DB_PROVIDER = (process.env.DB_PROVIDER || 'supabase') as 'supabase' | 'postgresql'

// 缓存客户端实例
let _supabase: any = null
let _supabaseAdmin: any = null

// 获取环境变量的函数
function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // 调试信息 (仅在开发环境或预览环境显示)
  if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview') {
    //console.log('Supabase Environment Check:', {
    //  url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
    //  anonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING',
    //  serviceKey: supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : 'MISSING'
    //})
  }

  // 验证必需的环境变量
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
  }

  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceKey }
}

// 延迟初始化的 Supabase 客户端
export async function getSupabase() {
  // 当使用 PostgreSQL 等非 Supabase 提供商时，返回兼容性客户端
  if (DB_PROVIDER !== 'supabase') {
    return await createCompatProxy(false)
  }

  // 默认 Supabase 行为
  if (!_supabase) {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
    _supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
  return _supabase
}

// 延迟初始化的 Supabase Admin 客户端
export async function getSupabaseAdmin() {
  // 非 Supabase 环境下返回兼容 ServiceRole 客户端
  if (DB_PROVIDER !== 'supabase') {
    return await createCompatProxy(true)
  }

  if (!_supabaseAdmin) {
    const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig()
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  }
  return _supabaseAdmin
}

// 创建兼容性代理，处理异步初始化
async function createCompatProxy(useServiceRole: boolean) {
  // 检查运行时环境
  const isEdgeRuntime = (typeof process !== 'undefined' && process.env.NEXT_RUNTIME === 'edge') ||
                       (typeof globalThis !== 'undefined' && 'EdgeRuntime' in globalThis)

  if (isEdgeRuntime) {
    // Edge Runtime 中，PostgreSQL 模式不可用
    throw new Error(
      'PostgreSQL mode detected in Edge Runtime environment. ' +
      'Please use the database abstraction layer in API routes instead of middleware. ' +
      'Middleware should use HTTP APIs for database operations in PostgreSQL mode.'
    )
  }

  // Node.js Runtime 中，使用 Supabase 兼容性适配器
  console.log(`PostgreSQL mode: Using Supabase compatibility adapter in Node.js Runtime (${useServiceRole ? 'admin' : 'client'})`)

  // 返回 Supabase 兼容性适配器
  const { createSupabaseCompatClient } = await import('./database/adapters/supabase-compat')
  return await createSupabaseCompatClient(useServiceRole)
}

// 向后兼容的导出
export const supabase = new Proxy({}, {
  get(_, prop) {
    // 由于 getSupabase 现在是异步的，这个代理不再适用
    // 请直接使用 await getSupabase()
    throw new Error('supabase proxy is deprecated. Please use await getSupabase() instead.')
  }
})

export const supabaseAdmin = new Proxy({}, {
  get(_, prop) {
    // 由于 getSupabaseAdmin 现在是异步的，这个代理不再适用
    // 请直接使用 await getSupabaseAdmin()
    throw new Error('supabaseAdmin proxy is deprecated. Please use await getSupabaseAdmin() instead.')
  }
})

// 数据库类型定义
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          linux_do_id: string | null
          username: string | null
          display_name: string | null
          avatar_url: string | null
          email: string | null
          trust_level: number
          is_active: boolean
          is_silenced: boolean
          last_login_at: string | null
          login_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          linux_do_id?: string | null
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          email?: string | null
          trust_level?: number
          is_active?: boolean
          is_silenced?: boolean
          last_login_at?: string | null
          login_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          linux_do_id?: string | null
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          email?: string | null
          trust_level?: number
          is_active?: boolean
          is_silenced?: boolean
          last_login_at?: string | null
          login_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          weight: number | null
          height: number | null
          age: number | null
          gender: string | null
          activity_level: string | null
          goal: string | null
          target_weight: number | null
          target_calories: number | null
          notes: string | null
          professional_mode: boolean | null
          medical_history: string | null
          lifestyle: string | null
          health_awareness: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          weight?: number | null
          height?: number | null
          age?: number | null
          gender?: string | null
          activity_level?: string | null
          goal?: string | null
          target_weight?: number | null
          target_calories?: number | null
          notes?: string | null
          professional_mode?: boolean | null
          medical_history?: string | null
          lifestyle?: string | null
          health_awareness?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          weight?: number | null
          height?: number | null
          age?: number | null
          gender?: string | null
          activity_level?: string | null
          goal?: string | null
          target_weight?: number | null
          target_calories?: number | null
          notes?: string | null
          professional_mode?: boolean | null
          medical_history?: string | null
          lifestyle?: string | null
          health_awareness?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shared_keys: {
        Row: {
          id: string
          user_id: string
          name: string
          base_url: string
          api_key_encrypted: string
          available_models: string[]
          daily_limit: number
          description: string | null
          tags: string[] | null
          is_active: boolean
          usage_count_today: number
          total_usage_count: number
          last_used_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          base_url: string
          api_key_encrypted: string
          available_models: string[]
          daily_limit?: number
          description?: string | null
          tags?: string[] | null
          is_active?: boolean
          usage_count_today?: number
          total_usage_count?: number
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          base_url?: string
          api_key_encrypted?: string
          available_models?: string[]
          daily_limit?: number
          description?: string | null
          tags?: string[] | null
          is_active?: boolean
          usage_count_today?: number
          total_usage_count?: number
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      key_usage_logs: {
        Row: {
          id: string
          shared_key_id: string
          user_id: string
          api_endpoint: string
          model_used: string
          tokens_used: number | null
          cost_estimate: number | null
          success: boolean
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shared_key_id: string
          user_id: string
          api_endpoint: string
          model_used: string
          tokens_used?: number | null
          cost_estimate?: number | null
          success: boolean
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          shared_key_id?: string
          user_id?: string
          api_endpoint?: string
          model_used?: string
          tokens_used?: number | null
          cost_estimate?: number | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
      }
      coach_snapshots: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          conversation_data: any
          model_config: any
          health_data_snapshot: any
          user_rating: number
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          conversation_data: any
          model_config: any
          health_data_snapshot: any
          user_rating: number
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          conversation_data?: any
          model_config?: any
          health_data_snapshot?: any
          user_rating?: number
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      ai_memories: {
        Row: {
          id: string
          user_id: string
          expert_id: string
          content: string
          version: number
          last_updated: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          expert_id: string
          content: string
          version?: number
          last_updated?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          expert_id?: string
          content?: string
          version?: number
          last_updated?: string
          created_at?: string
        }
      }
      snapshot_ratings: {
        Row: {
          id: string
          snapshot_id: string
          user_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          snapshot_id: string
          user_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          snapshot_id?: string
          user_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
      }
    }
  }
}

