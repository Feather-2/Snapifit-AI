#!/usr/bin/env node
/**
 * 执行最小化 PostgreSQL 初始化（开发验证用）
 * 需要设置 DATABASE_URL
 */
/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ 未设置 DATABASE_URL')
    process.exit(1)
  }
  const sqlPath = path.join(process.cwd(), 'scripts', 'pg-minimal-init.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false })
  await client.connect()
  try {
    console.log('🏗️  正在初始化 PostgreSQL 最小化 schema ...')
    await client.query(sql)
    console.log('✅ 完成')
  } catch (e) {
    console.error('❌ 执行失败:', e.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })

