/**
 * 测试生产环境下测试路由是否被正确阻止
 * 运行: NODE_ENV=production node test-production-routes.js
 */

const testRoutes = [
  // 测试页面路由
  'http://localhost:3000/zh/test-captcha',
  'http://localhost:3000/en/test-captcha',
  'http://localhost:3000/zh/test-tab-freeze',
  'http://localhost:3000/en/test-tab-freeze',
  
  // 调试页面路由
  'http://localhost:3000/debug/i18n-test',
  'http://localhost:3000/debug/oauth-test',
  
  // 测试 API 路由
  'http://localhost:3000/api/test',
  'http://localhost:3000/api/test-auth',
  'http://localhost:3000/api/test-model',
  'http://localhost:3000/api/test-rate-limit',
  'http://localhost:3000/api/debug/url-blacklist-test',
  'http://localhost:3000/api/admin/test-features',
  
  // 正常路由（应该工作）
  'http://localhost:3000/zh/verify-email?token=test',
  'http://localhost:3000/api/captcha/generate',
]

async function testRoutes() {
  console.log('🧪 测试生产环境路由阻止功能...')
  console.log('📝 NODE_ENV:', process.env.NODE_ENV)
  console.log('')

  for (const url of testRoutes) {
    console.log(`🔍 测试: ${url}`)
    
    try {
      const fetch = (await import('node-fetch')).default
      const response = await fetch(url, {
        method: 'GET',
        timeout: 5000
      })
      
      const status = response.status
      const isTestRoute = url.includes('/test') || url.includes('/debug')
      const shouldBeBlocked = isTestRoute && process.env.NODE_ENV === 'production'
      
      if (shouldBeBlocked) {
        if (status === 404) {
          console.log(`   ✅ 正确阻止 (${status})`)
        } else {
          console.log(`   ❌ 应该被阻止但没有 (${status})`)
        }
      } else {
        if (status === 200 || status === 400 || status === 422) {
          console.log(`   ✅ 正常访问 (${status})`)
        } else if (status === 404) {
          console.log(`   ⚠️  404 - 可能是正常的 (${status})`)
        } else {
          console.log(`   ❓ 其他状态 (${status})`)
        }
      }
    } catch (error) {
      console.log(`   ❌ 网络错误: ${error.message}`)
    }
    
    console.log('')
  }

  console.log('💡 说明:')
  console.log('- 在生产环境 (NODE_ENV=production) 下，测试和调试路由应该返回 404')
  console.log('- 在开发环境下，所有路由都应该正常工作')
  console.log('- verify-email 等正常功能路由不应该被阻止')
}

testRoutes().catch(console.error)
