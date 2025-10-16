// 简单的数据库适配器 - 用于 PostgreSQL 模式的基本功能
// 这个适配器提供最基本的数据库操作，避免复杂的兼容性问题

export class SimpleDbAdapter {
  from(table: string) {
    const self = this

    return {
      select: (columns?: string | string[]) => {
        return {
          eq: (column: string, value: any) => {
            return {
              single: async () => {
                console.log(`[SimpleDbAdapter] SELECT ${columns || '*'} FROM ${table} WHERE ${column} = ${value}`)

                // 模拟一些基本的系统配置
                if (table === 'system_configs') {
                  const mockConfigs: Record<string, any> = {
                    'system_message': { value: 'Welcome to SnapFit AI Community Edition (PostgreSQL Mode)' },
                    'maintenance_mode': { value: 'false' },
                    'registration_enabled': { value: 'true' },
                    'require_invite_code': { value: 'false' },
                    'default_trust_level': { value: '1' }
                  }

                  const result = mockConfigs[value]
                  return { data: result, error: null }
                }

                return { data: null, error: null }
              }
            }
          }
        }
      },

      insert: (data: any) => {
        return {
          then: async (callback?: Function) => {
            console.log(`[SimpleDbAdapter] INSERT INTO ${table}:`, data)
            const result = { data: { id: 'mock-id' }, error: null }
            return callback ? callback(result) : result
          }
        }
      },

      update: (data: any) => {
        return {
          eq: (column: string, value: any) => {
            return {
              then: async (callback?: Function) => {
                console.log(`[SimpleDbAdapter] UPDATE ${table} SET ... WHERE ${column} = ${value}:`, data)
                const result = { data: { id: value }, error: null }
                return callback ? callback(result) : result
              }
            }
          }
        }
      },

      delete: () => {
        return {
          eq: (column: string, value: any) => {
            return {
              then: async (callback?: Function) => {
                console.log(`[SimpleDbAdapter] DELETE FROM ${table} WHERE ${column} = ${value}`)
                const result = { data: null, error: null }
                return callback ? callback(result) : result
              }
            }
          }
        }
      }
    }
  }

  async rpc(functionName: string, params: any) {
    console.log(`[SimpleDbAdapter] CALL ${functionName}(${JSON.stringify(params)})`)

    // 模拟一些基本的 RPC 函数
    switch (functionName) {
      case 'is_ip_banned':
        return { data: [{ is_banned: false }], error: null }

      case 'create_user_with_password':
        return {
          data: [{ success: true, user_id: 'mock-user-id' }],
          error: null
        }

      default:
        return { data: null, error: null }
    }
  }

  // 模拟认证相关的方法
  get auth() {
    return {
      getUser: async (token: string) => {
        console.log(`[SimpleDbAdapter] AUTH getUser with token: ${token?.substring(0, 10)}...`)
        return {
          data: { user: null },
          error: { message: 'PostgreSQL mode: Auth not implemented' }
        }
      },

      signUp: async (credentials: any) => {
        console.log(`[SimpleDbAdapter] AUTH signUp:`, credentials)
        return {
          data: { user: null },
          error: { message: 'PostgreSQL mode: Auth not implemented' }
        }
      },

      signInWithPassword: async (credentials: any) => {
        console.log(`[SimpleDbAdapter] AUTH signInWithPassword:`, credentials)
        return {
          data: { user: null },
          error: { message: 'PostgreSQL mode: Auth not implemented' }
        }
      }
    }
  }
}

export function createSimpleDbAdapter() {
  return new SimpleDbAdapter()
}
