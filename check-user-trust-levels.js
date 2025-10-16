/**
 * 检查用户信任等级分配情况
 * 运行: node check-user-trust-levels.js
 */

const { createClient } = require('@supabase/supabase-js')

// 从环境变量读取配置
require('dotenv').config()

async function checkUserTrustLevels() {
  console.log('🔍 检查用户信任等级分配情况...')

  try {
    // 创建 Supabase 客户端
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 查询所有用户的相关字段
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, username, provider_type, trust_level, role, created_at')
      .order('created_at', { ascending: true })

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
      console.log(`  🔗 提供商: ${user.provider_type || '(null)'}`)
      console.log(`  🏆 信任等级: LV${user.trust_level}`)
      console.log(`  👑 角色: ${user.role || '(null)'}`)
      console.log(`  📅 创建时间: ${user.created_at}`)
      
      // 判断是否是第一个用户
      const isFirstUser = index === 0
      const shouldBeLV4 = isFirstUser
      const shouldBeSuperAdmin = isFirstUser
      
      console.log(`  🔍 应该是第一个用户: ${isFirstUser ? '✅ 是' : '❌ 否'}`)
      
      if (isFirstUser) {
        if (user.trust_level !== 4) {
          console.log(`  ⚠️  第一个用户信任等级错误: 应该是LV4，实际是LV${user.trust_level}`)
        }
        if (user.role !== 'super_admin') {
          console.log(`  ⚠️  第一个用户角色错误: 应该是super_admin，实际是${user.role}`)
        }
      } else {
        if (user.trust_level === 4 && user.role !== 'super_admin') {
          console.log(`  ⚠️  非第一个用户但有LV4权限: 可能是错误分配`)
        }
      }
    })

    console.log('\n' + '=' * 80)
    console.log('📋 统计信息:')
    
    const credentialUsers = users.filter(u => u.provider_type === 'credentials')
    const oauthUsers = users.filter(u => u.provider_type && u.provider_type !== 'credentials')
    const lv4Users = users.filter(u => u.trust_level === 4)
    const superAdmins = users.filter(u => u.role === 'super_admin')

    console.log(`  🔐 密码用户: ${credentialUsers.length}`)
    console.log(`  🔗 OAuth用户: ${oauthUsers.length}`)
    console.log(`  🏆 LV4用户: ${lv4Users.length}`)
    console.log(`  👑 超级管理员: ${superAdmins.length}`)

    // 检查问题
    console.log('\n🔍 问题检查:')
    
    if (lv4Users.length > 1) {
      console.log(`  ⚠️  发现多个LV4用户 (${lv4Users.length}个)，应该只有第一个用户是LV4`)
      lv4Users.forEach((user, index) => {
        if (index > 0) {
          console.log(`    - ${user.email} (${user.provider_type}) - 可能需要降级`)
        }
      })
    }

    if (superAdmins.length > 1) {
      console.log(`  ⚠️  发现多个超级管理员 (${superAdmins.length}个)，应该只有第一个用户是超级管理员`)
    }

    // 检查系统配置
    console.log('\n🔧 检查系统配置:')
    const { data: defaultTrustConfig } = await supabase
      .from('system_configs')
      .select('value')
      .eq('key', 'default_trust_level')
      .single()

    const defaultTrustLevel = defaultTrustConfig?.value ? parseInt(defaultTrustConfig.value) : 0
    console.log(`  📊 默认信任等级: LV${defaultTrustLevel}`)

    // 建议修复
    if (lv4Users.length > 1) {
      console.log('\n💡 建议修复:')
      console.log('  以下用户应该降级到默认信任等级:')
      lv4Users.forEach((user, index) => {
        if (index > 0) {
          console.log(`  - UPDATE users SET trust_level = ${defaultTrustLevel}, role = NULL WHERE id = '${user.id}'; -- ${user.email}`)
        }
      })
    }

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error.message)
  }
}

// 运行检查
checkUserTrustLevels()
