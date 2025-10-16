import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { EnvConfig } from '@/lib/env-config'

/**
 * 获取环境配置信息
 * GET /api/admin/env-config
 * 仅供管理员查看当前的环境变量配置状态
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    // 检查管理员权限
    const userRole = (session.user as any)?.role
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ success: false, error: '权限不足' }, { status: 403 })
    }

    // 获取环境配置摘要
    const configSummary = EnvConfig.getConfigSummary()
    
    // 验证配置
    const validation = EnvConfig.validateConfig()

    return NextResponse.json({
      success: true,
      data: {
        config: configSummary,
        validation,
        permissions: {
          canShareKeys: {
            superAdmin: true,
            admin: configSummary.allowNonSuperAdminShareKeys,
            description: configSummary.allowNonSuperAdminShareKeys 
              ? '管理员和超级管理员都可以分享密钥' 
              : '只有超级管理员可以分享密钥'
          },
          canUseNonThirdPartySources: {
            enabled: configSummary.allowNonThirdPartySources,
            description: configSummary.allowNonThirdPartySources
              ? '允许使用官方API地址和第三方源站'
              : '只允许使用第三方源站，禁止官方API地址'
          }
        },
        environment: {
          nodeEnv: configSummary.nodeEnv,
          dbProvider: configSummary.dbProvider,
          deploymentType: configSummary.deploymentType,
          forceHttps: configSummary.forceHttps
        }
      }
    })
  } catch (error) {
    console.error('Error getting env config:', error)
    return NextResponse.json(
      { success: false, error: '获取环境配置失败' },
      { status: 500 }
    )
  }
}

/**
 * 更新环境配置信息
 * POST /api/admin/env-config
 * 注意：这个API只能显示当前配置，不能修改环境变量
 * 环境变量需要在部署时通过.env文件或docker-compose配置
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    // 检查超级管理员权限
    const userRole = (session.user as any)?.role
    if (userRole !== 'super_admin') {
      return NextResponse.json({ success: false, error: '只有超级管理员可以查看此信息' }, { status: 403 })
    }

    return NextResponse.json({
      success: false,
      error: '环境变量配置需要通过.env文件或docker-compose.yml修改，然后重启应用',
      info: {
        message: '此API仅用于查看当前配置状态',
        configFiles: [
          '开发环境: .env.local',
          'Docker单容器: deployment/docker-single/.env',
          'Docker完整部署: deployment/docker-full/.env'
        ],
        envVars: [
          'ALLOW_NON_SUPER_ADMIN_SHARE_KEYS=true/false',
          'ALLOW_NON_THIRD_PARTY_SOURCES=true/false'
        ]
      }
    })
  } catch (error) {
    console.error('Error in env config POST:', error)
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    )
  }
}
