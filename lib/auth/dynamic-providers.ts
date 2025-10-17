import { hasFeature, getFeatureValue } from '../../config/features'

// 懒加载导入，避免未启用时引入不必要依赖
function buildGitHubProvider() {
  const { default: GitHub } = require('next-auth/providers/github')
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.warn('[auth] GitHub OAuth 未配置环境变量，已跳过 (GITHUB_CLIENT_ID/SECRET)')
    return null
  }
  return GitHub({
    clientId,
    clientSecret,
    httpOptions: { timeout: 30000 },
    checks: ['pkce', 'state'],
  })
}

function buildGoogleProvider() {
  const { default: Google } = require('next-auth/providers/google')
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.warn('[auth] Google OAuth 未配置环境变量，已跳过 (GOOGLE_CLIENT_ID/SECRET)')
    return null
  }
  return Google({ clientId, clientSecret })
}

// 预留占位：Linux.do OAuth（当前版本未内置，保留接口以便后续接入）
function buildLinuxDoProvider() {
  const clientId = process.env.LINUXDO_CLIENT_ID
  const clientSecret = process.env.LINUXDO_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.warn('[auth] Linux.do OAuth 未配置或未启用，已跳过 (LINUXDO_CLIENT_ID/SECRET)')
    return null
  }
  console.warn('[auth] Linux.do OAuth Provider 暂未实现，已跳过（仅保留占位以便未来接入）')
  return null
}

export function buildOAuthProviders() {
  const list: any[] = []
  const oauthEnabled = hasFeature('auth.oauth.enabled')
  if (!oauthEnabled) return list

  const providers = (getFeatureValue<string[]>('auth.oauth.providers') || []).map(p => p.toLowerCase())

  for (const p of providers) {
    switch (p) {
      case 'github': {
        const prov = buildGitHubProvider()
        if (prov) list.push(prov)
        break
      }
      case 'google': {
        const prov = buildGoogleProvider()
        if (prov) list.push(prov)
        break
      }
      case 'linuxdo': {
        const prov = buildLinuxDoProvider()
        if (prov) list.push(prov)
        break
      }
      default:
        console.warn(`[auth] 未识别的 OAuth Provider: ${p}`)
    }
  }

  return list
}

