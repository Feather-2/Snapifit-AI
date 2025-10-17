import NextAuth from "next-auth"
import type { NextAuthConfig, User, Account, Profile } from "next-auth"
import type { JWT } from "next-auth/jwt"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import { UserManager } from "./auth/user-manager"
import { getSupabase, getSupabaseAdmin } from "./supabase"
import { buildOAuthProviders } from "./auth/dynamic-providers"
import { hasFeature } from "../config/features"

// GitHub Provider 配置
const GitHubProvider = GitHub({
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  // 添加超时和重试配置
  httpOptions: {
    timeout: 30000, // 30秒超时
  },
  // 添加自定义请求配置
  checks: ["pkce", "state"],
})

// Google Provider 配置 - 暂时禁用（需要 HTTPS 和公共域名）
// const GoogleProvider = Google({
//   clientId: process.env.GOOGLE_CLIENT_ID!,
//   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
// })

// Credentials Provider 配置 - 支持邮箱或用户名登录
const CredentialsProvider = Credentials({
  id: "credentials",
  name: "Email/Username and Password",
  credentials: {
    identifier: {
      label: "Email or Username",
      type: "text",
      placeholder: "your@email.com or username"
    },
    password: {
      label: "Password",
      type: "password"
    }
  },
  async authorize(credentials) {
    if (!credentials?.identifier || !credentials?.password) {
      return null
    }

    try {
      // 使用 UserManager 验证用户凭据（支持邮箱或用户名）
      const result = await UserManager.verifyUserCredentials(
        credentials.identifier as string,
        credentials.password as string
      )

      if (!result.success || !result.data) {
        console.log('Login failed:', result.error)
        return null
      }

      const userData = result.data

      // 返回用户信息
      return {
        id: userData.id,
        email: userData.email,
        name: userData.username,
        image: userData.avatarUrl || null,
        // 添加自定义字段
        displayName: userData.displayName,
        trustLevel: userData.trustLevel,
        emailVerified: userData.emailVerified,
        isActive: userData.isActive,
        isSilenced: userData.isSilenced,
        provider: 'credentials'
      }
    } catch (error) {
      console.error('Error during credentials authorization:', error)
      return null
    }
  }
})

export const authConfig = {
  providers: [
    ...buildOAuthProviders(),
    ...(hasFeature('auth.credentials') ? [CredentialsProvider] : []),
  ],
  pages: {
    signIn: "/signin", // 自定义登录页面
  },
  // 添加网络和超时配置
  experimental: {
    enableWebAuthn: false, // 禁用WebAuthn以减少复杂性
  },
  // 🔧 移动端兼容性配置
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.FORCE_HTTPS === 'true', // 根据FORCE_HTTPS环境变量决定
        maxAge: 30 * 24 * 60 * 60, // 30天
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.FORCE_HTTPS === 'true',
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.FORCE_HTTPS === 'true',
      },
    },
  },
  // 添加信任主机配置
  trustHost: true,
  // 🔧 JWT配置
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30天
  },
  // 🔧 Session配置
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30天
    updateAge: 24 * 60 * 60, // 24小时更新一次
  },
  // 🔧 增强的错误处理和超时配置
  events: {
    async signIn(message) {
      console.log('✅ OAuth signIn event:', message.user?.email)
    },
    async signOut(message) {
      console.log('👋 OAuth signOut event:', message.session?.user?.email)
    },
    async createUser(message) {
      console.log('🆕 OAuth createUser event:', message.user?.email)
    },
    async linkAccount(message) {
      console.log('🔗 OAuth linkAccount event:', message.user?.email, message.account?.provider)
    },
    async session(message) {
      // 静默处理session事件，避免过多日志
    },
  },
  // 🔧 添加调试和错误处理
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, metadata) {
      console.error(`[NextAuth Error] ${code}:`, metadata)
    },
    warn(code) {
      console.warn(`[NextAuth Warning] ${code}`)
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[NextAuth Debug] ${code}:`, metadata)
      }
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // 处理 Credentials 登录
      if (account?.provider === "credentials") {
        // Credentials 登录已在 authorize 函数中验证
        // 这里只需要确保用户信息正确
        return user ? true : false
      }

      // 处理 OAuth 登录 (GitHub, Google)
      if ((account?.provider === "github" || account?.provider === "google") && profile) {
        // 处理OAuth登录

        if (!profile.id && !profile.sub) {
          console.error(`${account.provider} profile is missing 'id' or 'sub'. Cannot proceed with login.`);
          return false;
        }

        try {
          const providerId = (profile.id || profile.sub).toString();
          const providerType = account.provider;

          // 检查用户是否已存在（先通过邮箱查找）
          const supabase = await getSupabaseAdmin()
          console.log('🔍 Checking for existing user with email:', profile.email)

          let { data: existingUser, error: findError } = await supabase
            .from("users")
            .select("id, email, provider_id, provider_type, username")
            .eq("email", profile.email)
            .single();

          console.log('🔍 Email search result:', { existingUser, findError })

          // 如果通过邮箱没找到，再通过 provider ID 查找
          if (findError && findError.code === 'PGRST116') {
            console.log('🔍 Email not found, checking provider ID:', providerId, providerType)

            const { data: userByProvider, error: providerError } = await supabase
              .from("users")
              .select("id, email, provider_id, provider_type, username")
              .eq("provider_id", providerId)
              .eq("provider_type", providerType)
              .single();

            console.log('🔍 Provider search result:', { userByProvider, providerError })

            if (!providerError) {
              existingUser = userByProvider;
              findError = null;
            }
          }

          if (findError && findError.code !== 'PGRST116') { // PGRST116: 'No rows found'
            console.error("❌ Error finding user:", findError);
            return false;
          }

          const now = new Date().toISOString();

          if (existingUser) {
            // 先获取当前的login_count
            const { data: currentUser } = await supabase
              .from("users")
              .select("login_count, trust_level")
              .eq("id", existingUser.id)
              .single();

            // 用户已存在，更新用户信息
            const updateData = {
              username: profile.login || profile.name || profile.email?.split('@')[0],
              display_name: profile.name || profile.login || profile.email?.split('@')[0],
              email: profile.email,
              avatar_url: profile.avatar_url || profile.picture,
              provider_id: providerId,
              provider_type: providerType,
              last_login_at: now,
              login_count: (currentUser?.login_count || 0) + 1,
              updated_at: now
            };

            // 更新现有用户
            const { error: updateError } = await supabase
              .from("users")
              .update(updateData)
              .eq("id", existingUser.id);

            if (updateError) {
              console.error("Error updating user:", updateError);
              return false;
            }

            user.id = existingUser.id;

            // 将更新后的数据附加到user对象，以便JWT回调可以使用
            user.trustLevel = currentUser?.trust_level || 0; // 保持现有等级，新用户默认LV0
            user.displayName = updateData.display_name;
            user.isActive = true;
            user.isSilenced = false;
            user.provider = providerType;
            user.role = currentUser?.role || null;

            // 用户更新成功
          } else {
            // 检查是否是第一个用户
            const { count: userCount, error: countError } = await supabase
              .from('users')
              .select('*', { count: 'exact', head: true })

            const isFirstUser = !countError && (userCount === 0 || userCount === null)

            // 获取系统配置的默认信任等级
            let defaultTrustLevel = 0
            if (!isFirstUser) {
              try {
                const { data: defaultTrustLevelConfig } = await supabase
                  .from('system_configs')
                  .select('value')
                  .eq('key', 'default_trust_level')
                  .single()

                defaultTrustLevel = defaultTrustLevelConfig?.value ? parseInt(defaultTrustLevelConfig.value) : 0
              } catch (error) {
                console.error('Error fetching default trust level:', error)
                defaultTrustLevel = 0
              }
            }

            // 用户不存在，创建一个新用户
            const insertData = {
              username: profile.login || profile.name || profile.email?.split('@')[0],
              display_name: profile.name || profile.login || profile.email?.split('@')[0],
              email: profile.email,
              avatar_url: profile.avatar_url || profile.picture,
              provider_id: providerId,
              provider_type: providerType,
              trust_level: isFirstUser ? 4 : defaultTrustLevel, // 第一个用户LV4，其他用户使用系统配置
              role: isFirstUser ? 'super_admin' : null, // 第一个用户为超级管理员
              is_active: true,
              is_silenced: false,
              email_verified: profile.email_verified || false,
              last_login_at: now,
              login_count: 1,
              created_at: now,
              updated_at: now
            };

            // 创建新用户
            console.log('🔧 Attempting to create user with data:', {
              username: insertData.username,
              email: insertData.email,
              provider_id: insertData.provider_id,
              provider_type: insertData.provider_type,
              trust_level: insertData.trust_level,
              role: insertData.role
            })

            console.log('🔧 About to call supabase insert...')

            const insertResult = await supabase
              .from("users")
              .insert(insertData)
              .select("id")
              .single();

            console.log('🔧 Insert result received:', insertResult)

            const { data: newUser, error: createError } = insertResult

            if (createError) {
              console.error("❌ Error creating user:", createError);
              console.error("❌ Insert data was:", insertData);
              return false;
            }

            if (!newUser || !newUser.id) {
              console.error("❌ User creation returned null or missing id:", newUser);
              return false;
            }

            console.log('✅ User created successfully with ID:', newUser.id);
            // 将新创建的用户在我们数据库中的UUID附加到user对象上
            user.id = newUser.id;

            // 如果是第一个用户（超级管理员），为其创建默认的邀请码配置
            if (isFirstUser) {
              const { error: configError } = await supabase
                .from('invite_configs')
                .insert({
                  user_id: newUser.id,
                  interval_days: 1, // 超级管理员：1天间隔
                  codes_per_batch: 10, // 每次10个
                  max_total_codes: 1000, // 最大1000个
                  is_active: true,
                  created_by: newUser.id,
                  created_at: now,
                  updated_at: now
                })

              if (configError) {
                console.error("Error creating invite config for super admin:", configError)
              }
            }

            // 将创建的数据附加到user对象，以便JWT回调可以使用
            user.trustLevel = insertData.trust_level;
            user.displayName = insertData.display_name;
            user.isActive = insertData.is_active;
            user.isSilenced = insertData.is_silenced;
            user.provider = providerType;
            user.role = insertData.role;

            // 用户创建成功
          }
          return true; // 允许登录

        } catch (err) {
          console.error("Error during Supabase user processing:", err)
          return false
        }
      }
      return true
    },
    // JWT 回调函数 - 处理令牌信息
    async jwt({ token, user, account }: { token: JWT; user?: User; account?: Account | null }): Promise<JWT> {
      if (account && user) {
        // JWT callback - 存储用户数据到token

        token.accessToken = account.access_token
        token.id = user.id
        token.provider = account.provider

        // 存储额外的用户信息到 token
        if (user.displayName) token.displayName = user.displayName
        if (user.trustLevel !== undefined) token.trustLevel = user.trustLevel
        if (user.emailVerified !== undefined) token.emailVerified = user.emailVerified
        if (user.isActive !== undefined) token.isActive = user.isActive
        if (user.isSilenced !== undefined) token.isSilenced = user.isSilenced

        // Token数据已存储
      }
      return token
    },
    async session({ session, token }: { session: any; token: JWT }): Promise<any> {
      session.accessToken = token.accessToken
      if (session.user) {
        session.user.id = token.id as string
        session.user.provider = token.provider

        // 获取用户的最新信息
        try {
          const supabase = await getSupabaseAdmin()
          const { data: userData, error } = await supabase
            .from('users')
            .select('trust_level, display_name, is_active, is_silenced, role, email_verified, username, email, avatar_url, provider_type, created_at')
            .eq('id', token.id as string)
            .single()

          if (!error && userData) {

            session.user.trustLevel = userData.trust_level || 0
            session.user.displayName = userData.display_name
            session.user.isActive = userData.is_active
            session.user.isSilenced = userData.is_silenced
            session.user.role = userData.role || 'user'
            session.user.emailVerified = userData.email_verified

            // 确保基本信息也是最新的
            if (userData.username) session.user.name = userData.username
            if (userData.email) session.user.email = userData.email
            if (userData.avatar_url) session.user.image = userData.avatar_url
            if (userData.provider_type) (session.user as any).provider = userData.provider_type
            if (userData.created_at) (session.user as any).createdAt = userData.created_at
          } else {
            // 获取失败，使用token中的信息作为备用
            // 如果获取失败，使用 token 中的信息作为备用
            session.user.trustLevel = token.trustLevel || 0
            session.user.displayName = token.displayName
            session.user.isActive = token.isActive !== false
            session.user.isSilenced = token.isSilenced || false
            session.user.role = 'user'
            session.user.emailVerified = token.emailVerified || false
          }
        } catch (error) {
          console.error('❌ Error fetching user info in session callback:', error)
          // 如果获取失败，设置默认值
          session.user.trustLevel = 0
          session.user.role = 'user'
          session.user.isActive = true
          session.user.isSilenced = false
          session.user.emailVerified = false
        }

        // Session数据已准备完成
      }
      return session
    },
  },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
