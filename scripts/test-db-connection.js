#!/usr/bin/env node

/**
 * 数据库连接测试脚本
 * 用于诊断和测试数据库连接问题
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

async function testDatabaseConnection() {
  console.log('🔍 开始数据库连接测试...\n')

  // 检查环境变量
  console.log('📋 环境变量检查:')
  console.log(`DB_PROVIDER: ${process.env.DB_PROVIDER}`)
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '已设置' : '未设置'}`)

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL 环境变量未设置')
    process.exit(1)
  }

  // 解析数据库URL
  const dbUrl = new URL(process.env.DATABASE_URL)
  console.log(`数据库主机: ${dbUrl.hostname}`)
  console.log(`数据库端口: ${dbUrl.port}`)
  console.log(`数据库名称: ${dbUrl.pathname.slice(1)}`)
  console.log(`用户名: ${dbUrl.username}`)
  console.log('')

  // 创建连接池配置
  const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 5,                         // 测试时使用较少连接
    idleTimeoutMillis: 30000,       // 30秒
    connectionTimeoutMillis: 10000, // 10秒连接超时
    query_timeout: 30000,           // 30秒查询超时
    statement_timeout: 30000,       // 30秒语句超时
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  }

  console.log('🔧 连接池配置:')
  console.log(`最大连接数: ${poolConfig.max}`)
  console.log(`连接超时: ${poolConfig.connectionTimeoutMillis}ms`)
  console.log(`查询超时: ${poolConfig.query_timeout}ms`)
  console.log(`SSL: ${poolConfig.ssl ? '启用' : '禁用'}`)
  console.log('')

  const pool = new Pool(poolConfig)

  try {
    console.log('🔌 尝试连接数据库...')
    const start = Date.now()

    // 测试基本连接
    const client = await pool.connect()
    const connectTime = Date.now() - start
    console.log(`✅ 连接成功! 耗时: ${connectTime}ms`)

    // 测试基本查询
    console.log('📊 执行测试查询...')
    const queryStart = Date.now()
    const result = await client.query('SELECT NOW() as current_time, version() as version')
    const queryTime = Date.now() - queryStart

    console.log(`✅ 查询成功! 耗时: ${queryTime}ms`)
    console.log(`当前时间: ${result.rows[0].current_time}`)
    console.log(`数据库版本: ${result.rows[0].version}`)

    // 测试表是否存在
    console.log('\n🗂️  检查核心表是否存在...')
    const tables = ['users', 'shared_keys', 'daily_logs', 'ai_memories', 'security_events']

    for (const table of tables) {
      try {
        const tableResult = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          )
        `, [table])

        const exists = tableResult.rows[0].exists
        console.log(`${exists ? '✅' : '❌'} 表 ${table}: ${exists ? '存在' : '不存在'}`)
      } catch (error) {
        console.log(`❌ 检查表 ${table} 时出错: ${error.message}`)
      }
    }

    // 释放连接
    client.release()

    console.log('\n🎉 数据库连接测试完成!')

  } catch (error) {
    console.error('\n❌ 数据库连接失败:')
    console.error(`错误类型: ${error.constructor.name}`)
    console.error(`错误消息: ${error.message}`)

    if (error.code) {
      console.error(`错误代码: ${error.code}`)
    }

    // 提供解决建议
    console.log('\n💡 可能的解决方案:')

    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      console.log('- 网络连接超时，检查网络连接')
      console.log('- 尝试增加连接超时时间')
      console.log('- 检查防火墙设置')
    }

    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.log('- DNS解析失败，检查主机名是否正确')
      console.log('- 检查网络连接')
    }

    if (error.message.includes('ECONNREFUSED')) {
      console.log('- 数据库服务器拒绝连接')
      console.log('- 检查数据库服务是否运行')
      console.log('- 检查端口是否正确')
    }

    if (error.message.includes('authentication') || error.message.includes('password')) {
      console.log('- 用户名或密码错误')
      console.log('- 检查数据库凭据')
    }

    if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('- 数据库不存在')
      console.log('- 检查数据库名称是否正确')
    }

    console.log('- 检查 .env.local 文件中的 DATABASE_URL 配置')
    console.log('- 尝试重启应用程序')

    process.exit(1)
  } finally {
    await pool.end()
  }
}

// 运行测试
testDatabaseConnection().catch(console.error)
