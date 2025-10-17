import { hasFeature, getFeatureValue } from '../../config/features'

// GitHub
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
    checks: ['pkce', 'state'],
  })
}

// Google
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

// Linux.do（优先 OIDC，其次通用 OAuth2）
function buildLinuxDoProvider() {
  // 兼容两套环境变量命名
  const clientId = process.env.LINUXDO_CLIENT_ID || process.env.OAUTH_CLIENT_ID
  const clientSecret = process.env.LINUXDO_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET
  const issuer = process.env.LINUXDO_ISSUER
  const wellKnown = process.env.LINUXDO_WELL_KNOWN_URL

  const authUrl = process.env.LINUXDO_AUTH_URL || process.env.OAUTH_AUTH_URL
  const tokenUrl = process.env.LINUXDO_TOKEN_URL || process.env.OAUTH_TOKEN_URL
  const userInfoUrl = process.env.LINUXDO_USER_INFO_URL || process.env.OAUTH_USER_INFO_URL || process.env.OAUTH_USERINFO_URL
  const scopes = process.env.LINUXDO_SCOPES || process.env.OAUTH_SCOPES || 'openid profile email'

  if (!clientId || !clientSecret) {
    console.warn('[auth] Linux.do OAuth 跳过：缺少 CLIENT_ID/CLIENT_SECRET')
    return null
  }

  // OIDC 模式
  if (issuer || wellKnown) {
    const { default: OIDC } = require('next-auth/providers/oidc')
    return OIDC({
      id: 'linuxdo',
      name: 'Linux.do',
      clientId,
      clientSecret,
      issuer,
      wellKnown,
      checks: ['pkce', 'state'],
      profile(profile: any) {
        const p: any = profile || {}
        const raw = p.user || p
        const users = Array.isArray(p.users) ? p.users : undefined
        const u = raw || (users ? users[0] : {})
        const id = u.id || u.sub || p.sub
        const username = u.username || u.login || u.name
        const name = u.name || username
        const email = u.email || null
        let image = u.avatar_url || u.picture || null
        const avatarTemplate = u.avatar_template || p.avatar_template
        if (!image && avatarTemplate) {
          image = (avatarTemplate as string).includes('{size}')
            ? `https://connect.linux.do${avatarTemplate.replace('{size}', '120')}`
            : `https://connect.linux.do${avatarTemplate}`
        }
        return { id: String(id), name, email, image }
      },
    })
  }

  // 通用 OAuth2 模式
  if (!authUrl || !tokenUrl || !userInfoUrl) {
    console.warn('[auth] Linux.do OAuth 跳过：未提供 OIDC，也未提供完整 OAuth2 端点 (AUTH/TOKEN/USERINFO)')
    return null
  }

  const { default: OAuth } = require('next-auth/providers/oauth')
  return OAuth({
    id: 'linuxdo',
    name: 'Linux.do',
    type: 'oauth',
    authorization: { url: authUrl, params: { scope: scopes } },
    token: tokenUrl,
    userinfo: {
      async request({ tokens }: any) {
        const res = await fetch(userInfoUrl, {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (Array.isArray(data?.users) && data.users.length > 0) {
          return data.users[0]
        }
        return data
      },
    },
    profile(profile: any) {
      const p: any = profile || {}
      const id = p.id || p.sub || p.user_id
      const username = p.username || p.login || p.name
      const name = p.name || username
      const email = p.email || null
      let image = p.avatar_url || p.picture || null
      const avatarTemplate = p.avatar_template
      if (!image && avatarTemplate) {
        image = (avatarTemplate as string).includes('{size}')
          ? `https://connect.linux.do${avatarTemplate.replace('{size}', '120')}`
          : `https://connect.linux.do${avatarTemplate}`
      }
      return { id: String(id), name, email, image }
    },
    checks: ['pkce', 'state'],
  })
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

