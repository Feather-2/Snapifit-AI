import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { PermissionHelper, EnvConfig } from '@/lib/env-config'
import { AdminManager, Permission } from '@/lib/auth/admin-manager'

/**
 * 调试API：检查当前用户的角色和权限
 * GET /api/debug/user-role
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: '未登录',
        debug: {
          session: null
        }
      }, { status: 401 })
    }

    // 从数据库获取用户详细信息
    const supabaseAdmin = await getSupabaseAdmin()
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, username, email, role, trust_level, permissions, created_at')
      .eq('id', session.user.id)
      .single()

    if (userError) {
      console.error('Error fetching user:', userError)
    }

    // 检查各种权限
    const canShareKeysEnv = PermissionHelper.canShareKeys(user?.role || 'user')
    const canShareKeysAdmin = await AdminManager.hasPermission(session.user.id, Permission.CREATE_INVITE_CODES)
    const canManageInviteCodes = await AdminManager.hasPermission(session.user.id, Permission.MANAGE_INVITE_CODES)

    // 检查信任等级权限
    const { UserManager } = require('@/lib/user-manager')
    const userManager = new UserManager()
    const canShareKeysTrustLevel = userManager.canShareKeys(user?.trust_level || 0, user?.role)
    const canManageKeysTrustLevel = userManager.canManageKeys(user?.trust_level || 0, user?.role)

    // 检查信任等级配置的权限（考虑环境变量）
    const { hasPermission: trustLevelHasPermission } = require('@/config/trust-level-limits')
    const trustLevelCanShare = trustLevelHasPermission(user?.trust_level || 0, 'canShareKeys')
    const trustLevelCanManage = trustLevelHasPermission(user?.trust_level || 0, 'canManageKeys')

    // 检查统一权限检查
    const canShareKeysUnified = PermissionHelper.canShareKeysUnified(user?.role, user?.trust_level || 0)
    const canCreateInviteCodesUnified = PermissionHelper.canCreateInviteCodesUnified(user?.role, user?.trust_level || 0)



    // 获取环境配置
    const envConfig = EnvConfig.getConfigSummary()

    return NextResponse.json({
      success: true,
      debug: {
        session: {
          userId: session.user.id,
          name: session.user.name,
          email: session.user.email,
          sessionRole: (session.user as any)?.role,
          sessionTrustLevel: (session.user as any)?.trustLevel
        },
        database: {
          user: user || null,
          error: userError?.message || null
        },
        permissions: {
          canShareKeysEnv,
          canShareKeysAdmin,
          canManageInviteCodes,
          canShareKeysTrustLevel,
          canManageKeysTrustLevel,
          trustLevelCanShare,
          trustLevelCanManage,
          canShareKeysUnified,
          canCreateInviteCodesUnified,
          explanation: {
            envCheck: `PermissionHelper.canShareKeys("${user?.role || 'unknown'}") = ${canShareKeysEnv}`,
            adminCheck: `AdminManager.hasPermission(CREATE_INVITE_CODES) = ${canShareKeysAdmin}`,
            manageCheck: `AdminManager.hasPermission(MANAGE_INVITE_CODES) = ${canManageInviteCodes}`,
            trustLevelUserManager: `UserManager.canShareKeys(${user?.trust_level || 0}) = ${canShareKeysTrustLevel}`,
            trustLevelConfig: `hasPermission(${user?.trust_level || 0}, 'canShareKeys') = ${trustLevelCanShare}`,
            unifiedCheck: `PermissionHelper.canShareKeysUnified("${user?.role || 'null'}", ${user?.trust_level || 0}) = ${canShareKeysUnified}`,
            inviteCodesUnifiedCheck: `PermissionHelper.canCreateInviteCodesUnified("${user?.role || 'null'}", ${user?.trust_level || 0}) = ${canCreateInviteCodesUnified}`
          }
        },
        environment: {
          config: envConfig,
          nodeEnv: process.env.NODE_ENV,
          allowNonSuperAdminShareKeys: process.env.ALLOW_NON_SUPER_ADMIN_SHARE_KEYS,
          allowNonThirdPartySources: process.env.ALLOW_NON_THIRD_PARTY_SOURCES
        },
        analysis: {
          expectedBehavior: envConfig.allowNonSuperAdminShareKeys
            ? '管理员和超级管理员都应该可以分享密钥，信任等级用户根据环境变量配置'
            : '只有超级管理员应该可以分享密钥，信任等级用户应该被禁止',
          actualRole: user?.role || 'unknown',
          actualTrustLevel: user?.trust_level || 0,
          shouldHaveAccessByRole: user?.role === 'super_admin' ||
            (envConfig.allowNonSuperAdminShareKeys && user?.role === 'admin'),
          shouldHaveAccessByTrustLevel: envConfig.allowNonSuperAdminShareKeys && (user?.trust_level || 0) >= 1,
          roleDiscrepancy: canShareKeysAdmin !== (user?.role === 'super_admin' ||
            (envConfig.allowNonSuperAdminShareKeys && user?.role === 'admin')),
          trustLevelDiscrepancy: trustLevelCanShare !== (envConfig.allowNonSuperAdminShareKeys && (user?.trust_level || 0) >= 1),
          finalResult: {
            anyMethodAllows: canShareKeysEnv || canShareKeysAdmin || canShareKeysTrustLevel || trustLevelCanShare,
            allMethodsConsistent: canShareKeysEnv === canShareKeysAdmin && canShareKeysAdmin === trustLevelCanShare,
            unifiedResult: canShareKeysUnified,
            shouldUseUnified: true,
            unifiedMatchesExpected: canShareKeysUnified === (user?.role === 'super_admin' ||
              (envConfig.allowNonSuperAdminShareKeys && (user?.role === 'admin' || (user?.trust_level || 0) >= 1)))
          }
        }
      }
    })
  } catch (error) {
    console.error('Error in user role debug:', error)
    return NextResponse.json({
      success: false,
      error: '调试失败',
      debug: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 })
  }
}
