/**
 * 检查用户数据中的 registration_type 和 provider_type
 * 运行: node check-user-data.js
 */

const { createClient } = require('@supabase/supabase-js')

// 从环境变量读取配置
require('dotenv').config()

async function checkUserData() {
  console.log('🔍 检查用户数据...')

  try {
    // 创建 Supabase 客户端
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 查询所有用户的相关字段
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, username, provider_type, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('❌ 查询用户数据失败:', error)
      return
    }

    console.log(`\n📊 找到 ${users.length} 个用户:`)
    console.log('=' * 80)

    users.forEach((user, index) => {
      console.log(`\n👤 用户 ${index + 1}:`)
      console.log(`  📧 邮箱: ${user.email}`)
      console.log(`  👤 用户名: ${user.username}`)
      console.log(`  🔗 提供商类型: ${user.provider_type || '(null)'}`)
      console.log(`  📅 创建时间: ${user.created_at}`)

      // 判断是否支持密码重置
      const supportsPasswordReset = user.provider_type === 'credentials'

      console.log(`  🔑 支持密码重置: ${supportsPasswordReset ? '✅ 是' : '❌ 否'}`)
    })

    console.log('\n' + '=' * 80)
    console.log('📋 总结:')

    const credentialUsers = users.filter(u => u.provider_type === 'credentials')
    const oauthUsers = users.filter(u => u.provider_type && u.provider_type !== 'credentials')
    const nullUsers = users.filter(u => !u.provider_type)

    console.log(`  🔐 密码凭据用户: ${credentialUsers.length}`)
    console.log(`  🔗 OAuth用户: ${oauthUsers.length}`)
    console.log(`  ❓ 未知类型用户: ${nullUsers.length}`)

    const supportPasswordReset = credentialUsers.length
    console.log(`\n🔑 支持密码重置的用户总数: ${supportPasswordReset}/${users.length}`)

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error.message)
  }
}

// 运行检查
checkUserData()
