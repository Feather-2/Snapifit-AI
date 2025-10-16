/**
 * 创建 reset_password 数据库函数
 * 运行: node create-reset-password-function.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 从环境变量读取配置
require('dotenv').config()

async function createResetPasswordFunction() {
  console.log('🔧 创建 reset_password 数据库函数...')

  try {
    // 创建 Supabase 客户端
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 读取SQL文件
    const sqlPath = path.join(__dirname, 'database', 'functions', 'reset_password.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('📄 执行SQL:')
    console.log(sql)

    // 执行SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
      console.error('❌ 创建函数失败:', error)
      
      // 如果没有 exec_sql 函数，尝试直接执行
      console.log('🔄 尝试直接执行SQL...')
      
      // 分割SQL语句并逐个执行
      const statements = sql.split(';').filter(stmt => stmt.trim())
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log('执行:', statement.substring(0, 50) + '...')
          const { error: execError } = await supabase.rpc('exec', { sql: statement })
          if (execError) {
            console.error('❌ 执行失败:', execError)
          }
        }
      }
    } else {
      console.log('✅ 函数创建成功!')
      console.log('📋 结果:', data)
    }

    // 测试函数是否存在
    console.log('\n🧪 测试函数是否可用...')
    const { data: testData, error: testError } = await supabase
      .rpc('reset_password', {
        p_email: 'test@example.com',
        p_token: 'invalid-token',
        p_new_password_hash: 'test-hash'
      })

    if (testError) {
      if (testError.message.includes('Could not find the function')) {
        console.log('❌ 函数仍然不存在，需要手动创建')
        console.log('\n📋 请在数据库中手动执行以下SQL:')
        console.log('=' * 50)
        console.log(sql)
        console.log('=' * 50)
      } else {
        console.log('✅ 函数存在但参数无效（这是预期的）')
        console.log('📋 测试错误:', testError.message)
      }
    } else {
      console.log('✅ 函数测试成功!')
      console.log('📋 测试结果:', testData)
    }

  } catch (error) {
    console.error('❌ 创建过程中发生错误:', error.message)
  }
}

// 运行创建
createResetPasswordFunction()
