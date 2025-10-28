#!/usr/bin/env node
/**
 * 为社区版 PostgreSQL 创建凭证用户（用于 E2E 登录）
 * 用法：
 *   node scripts/pg-create-user.js <username> <email> <password>
 * 需要：DATABASE_URL
 */
/* eslint-disable no-console */
const { Client } = require('pg')
const bcrypt = require('bcryptjs')

async function main() {
  const [, , u, e, p] = process.argv
  const username = u || process.env.TEST_USERNAME || 'testuser'
  const email = e || process.env.TEST_EMAIL || 'test@example.com'
  const password = p || process.env.TEST_PASSWORD || 'TestPass123!'

  if (!process.env.DATABASE_URL) {
    console.error('❌ 未设置 DATABASE_URL')
    process.exit(1)
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false })
  await client.connect()
  try {
    const now = new Date().toISOString()
    const hash = await bcrypt.hash(password, 12)

    // 确保 users 表存在（最小化情况下）
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username varchar(100) UNIQUE,
        email varchar(255) UNIQUE,
        password_hash text,
        display_name varchar(255),
        avatar_url text,
        trust_level integer DEFAULT 0,
        is_active boolean DEFAULT true,
        is_silenced boolean DEFAULT false,
        provider_id text,
        provider_type text,
        email_verified boolean DEFAULT false,
        email_verification_token text,
        password_reset_token text,
        password_reset_expires timestamptz,
        last_login_at timestamptz,
        login_count integer DEFAULT 0,
        role text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `)

    // upsert 用户
    const q = `
      INSERT INTO public.users (username, email, password_hash, display_name, trust_level, is_active, is_silenced, provider_type, email_verified, role, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,true,false,'credentials',true,'user',$6,$6)
      ON CONFLICT (username) DO UPDATE SET
        email=excluded.email,
        password_hash=excluded.password_hash,
        display_name=excluded.display_name,
        trust_level=excluded.trust_level,
        email_verified=excluded.email_verified,
        updated_at=excluded.updated_at
      RETURNING id
    `
    const { rows } = await client.query(q, [username, email, hash, username, 2, now])
    console.log('✅ 用户创建/更新完成:', { id: rows[0]?.id, username, email })
  } catch (e) {
    console.error('❌ 失败:', e.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })

