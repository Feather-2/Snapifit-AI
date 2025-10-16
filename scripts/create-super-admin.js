#!/usr/bin/env node

/**
 * 创建超级管理员脚本
 * 用于初始化系统的第一个超级管理员账户
 */

const bcrypt = require('bcryptjs')
const readline = require('readline')

// 动态导入 ES 模块
let supabaseAdmin;

async function initSupabase() {
  if (!supabaseAdmin) {
    // 检查环境变量
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ 缺少必要的环境变量:')
      console.error('   NEXT_PUBLIC_SUPABASE_URL')
      console.error('   SUPABASE_SERVICE_ROLE_KEY')
      process.exit(1)
    }

    const { getSupabaseAdmin } = await import('../lib/supabase.js');
    supabaseAdmin = await getSupabaseAdmin();
  }
  return supabaseAdmin;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

function questionHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')

    let password = ''

    process.stdin.on('data', function(char) {
      char = char + ''

      switch(char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdout.write('\n')
          resolve(password)
          break
        case '\u0003':
          process.exit()
          break
        case '\u007f': // backspace
          if (password.length > 0) {
            password = password.slice(0, -1)
            process.stdout.write('\b \b')
          }
          break
        default:
          password += char
          process.stdout.write('*')
          break
      }
    })
  })
}

async function validateInput(username, email, password) {
  const errors = []

  // 验证用户名
  if (!username || username.length < 2 || username.length > 50) {
    errors.push('用户名必须在2-50个字符之间')
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push('用户名只能包含字母、数字、下划线和连字符')
  }

  // 验证邮箱
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    errors.push('邮箱格式不正确')
  }

  // 验证密码强度
  if (password.length < 8) {
    errors.push('密码至少需要8个字符')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('密码需要包含小写字母')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('密码需要包含大写字母')
  }

  if (!/\d/.test(password)) {
    errors.push('密码需要包含数字')
  }

  return errors
}

async function checkExistingSuperAdmin() {
  try {
    const supabase = await initSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'super_admin')
      .eq('is_active', true)
      .limit(1)

    if (error) {
      throw error
    }

    return data && data.length > 0
  } catch (error) {
    console.error('❌ 检查现有超级管理员时出错:', error.message)
    return false
  }
}

async function createSuperAdmin() {
  try {
    console.log('🚀 Snapifit AI 超级管理员创建工具\n')

    // 检查是否已有超级管理员
    const hasExistingSuperAdmin = await checkExistingSuperAdmin()
    if (hasExistingSuperAdmin) {
      console.log('❌ 系统中已存在超级管理员账户')
      console.log('   如需重置，请联系系统管理员')
      return
    }

    console.log('📝 请输入超级管理员信息:\n')

    // 获取用户输入
    const username = await question('用户名: ')
    const email = await question('邮箱: ')
    const password = await questionHidden('密码: ')
    const confirmPassword = await questionHidden('确认密码: ')
    const displayName = await question('显示名称 (可选): ')

    // 验证密码确认
    if (password !== confirmPassword) {
      console.log('\n❌ 密码确认不匹配')
      return
    }

    // 验证输入
    const validationErrors = await validateInput(username, email, password)
    if (validationErrors.length > 0) {
      console.log('\n❌ 输入验证失败:')
      validationErrors.forEach(error => console.log(`   - ${error}`))
      return
    }

    console.log('\n🔐 正在创建超级管理员...')

    // 哈希密码
    const passwordHash = await bcrypt.hash(password, 12)

    // 调用数据库函数创建超级管理员
    const supabase = await initSupabase();
    const { data, error } = await supabase
      .rpc('create_super_admin', {
        p_username: username,
        p_email: email,
        p_password_hash: passwordHash,
        p_display_name: displayName || username
      })

    if (error) {
      throw error
    }

    if (!data.success) {
      console.log(`❌ 创建失败: ${data.error}`)
      return
    }

    console.log('\n✅ 超级管理员创建成功!')
    console.log(`   用户ID: ${data.user_id}`)
    console.log(`   用户名: ${username}`)
    console.log(`   邮箱: ${email}`)
    console.log(`   角色: super_admin`)
    console.log('\n🎉 现在您可以使用这个账户登录管理系统了!')

  } catch (error) {
    console.error('\n❌ 创建超级管理员时出错:', error.message)
  } finally {
    rl.close()
  }
}

// 运行脚本
if (require.main === module) {
  createSuperAdmin()
}

module.exports = { createSuperAdmin }
