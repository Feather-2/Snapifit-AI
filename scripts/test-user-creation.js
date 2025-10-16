#!/usr/bin/env node

/**
 * 测试用户创建脚本
 * 用于调试 OAuth 用户创建问题
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// 手动读取 .env.local 文件
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=')
          process.env[key] = value
        }
      }
    }
  }
}

loadEnvFile()

async function testUserCreation() {
  console.log('🔍 测试用户创建...\n')
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  })
  
  try {
    // 模拟 GitHub OAuth 用户数据
    const testUserData = {
      username: 'testuser123',
      display_name: 'Test User',
      email: 'test@example.com',
      avatar_url: 'https://avatars.githubusercontent.com/u/123456?v=4',
      provider_id: '123456',
      provider_type: 'github',
      trust_level: 4, // 第一个用户
      role: 'super_admin',
      is_active: true,
      is_silenced: false,
      email_verified: true,
      last_login_at: new Date().toISOString(),
      login_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('📝 测试数据:')
    console.log(JSON.stringify(testUserData, null, 2))
    console.log('')
    
    // 检查是否已存在
    console.log('🔍 检查用户是否已存在...')
    const existingCheck = await pool.query(
      'SELECT id, email, provider_id, provider_type FROM users WHERE email = $1 OR (provider_id = $2 AND provider_type = $3)',
      [testUserData.email, testUserData.provider_id, testUserData.provider_type]
    )
    
    if (existingCheck.rows.length > 0) {
      console.log('⚠️  用户已存在:', existingCheck.rows[0])
      console.log('删除现有用户进行测试...')
      await pool.query('DELETE FROM users WHERE id = $1', [existingCheck.rows[0].id])
      console.log('✅ 已删除现有用户')
    } else {
      console.log('✅ 用户不存在，可以创建')
    }
    
    // 尝试插入用户
    console.log('\n📝 尝试创建用户...')
    const insertQuery = `
      INSERT INTO users (
        username, display_name, email, avatar_url, provider_id, provider_type,
        trust_level, role, is_active, is_silenced, email_verified,
        last_login_at, login_count, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      ) RETURNING id, username, email
    `
    
    const values = [
      testUserData.username,
      testUserData.display_name,
      testUserData.email,
      testUserData.avatar_url,
      testUserData.provider_id,
      testUserData.provider_type,
      testUserData.trust_level,
      testUserData.role,
      testUserData.is_active,
      testUserData.is_silenced,
      testUserData.email_verified,
      testUserData.last_login_at,
      testUserData.login_count,
      testUserData.created_at,
      testUserData.updated_at
    ]
    
    console.log('SQL:', insertQuery)
    console.log('Values:', values)
    
    const result = await pool.query(insertQuery, values)
    
    if (result.rows && result.rows.length > 0) {
      console.log('\n✅ 用户创建成功!')
      console.log('返回数据:', result.rows[0])
    } else {
      console.log('\n❌ 用户创建失败: 没有返回数据')
      console.log('Result:', result)
    }
    
  } catch (error) {
    console.error('\n❌ 用户创建失败:')
    console.error('错误类型:', error.constructor.name)
    console.error('错误消息:', error.message)
    console.error('错误代码:', error.code)
    console.error('错误详情:', error.detail)
    console.error('完整错误:', error)
  } finally {
    await pool.end()
  }
}

// 运行测试
testUserCreation().catch(console.error)
