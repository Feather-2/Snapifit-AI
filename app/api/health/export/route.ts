import { NextRequest, NextResponse } from 'next/server'
import { withApiTokenAuth } from '@/lib/middleware/api-token-auth'
import type { AuthenticatedRequest } from '@/lib/middleware/api-token-auth'
import { getDb } from '@/lib/database'

/**
 * GET /api/health/export - 导出健康数据
 * 需要API令牌认证，需要 'export' 作用域和 'read' 权限
 */
export async function GET(request: NextRequest) {
  // 验证API令牌
  const authResult = await withApiTokenAuth(request, {
    requiredScope: ['export'],
    requiredPermissions: ['read']
  })

  if (!authResult.success) {
    return authResult.response!
  }

  const authenticatedRequest = authResult.request!

  try {
    const userId = authenticatedRequest.user!.id
    const remainingUsage = authenticatedRequest.user!.remainingUsage

    // 检查使用量提醒
    if (remainingUsage < 10) {
      // 在响应头中添加使用量警告
      const headers = new Headers()
      headers.set('X-Usage-Warning', `令牌剩余使用次数: ${remainingUsage}`)
    }

    // 获取查询参数
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'json'
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')
    const dataTypes = url.searchParams.get('types')?.split(',') || ['all']

    // 验证参数
    if (format && !['json', 'csv', 'xml'].includes(format)) {
      return NextResponse.json(
        { error: '不支持的导出格式，支持: json, csv, xml' },
        { status: 400 }
      )
    }

    // 获取健康数据
    const db = await getDb()

    let healthData: any = {}

    // 根据请求的数据类型导出相应数据
    if (dataTypes.includes('all') || dataTypes.includes('logs')) {
      const { data: logs } = await db.select('health_logs', {
        where: {
          user_id: userId,
          ...(startDate && { date: { gte: startDate } }),
          ...(endDate && { date: { lte: endDate } })
        },
        orderBy: [{ column: 'date', ascending: false }]
      })
      healthData.logs = logs || []
    }

    if (dataTypes.includes('all') || dataTypes.includes('profile')) {
      const { data: profile } = await db.selectOne('user_profiles', {
        where: { user_id: userId }
      })
      healthData.profile = profile
    }

    // 根据格式返回数据
    switch (format) {
      case 'json':
        return NextResponse.json({
          success: true,
          data: healthData,
          exported_at: new Date().toISOString(),
          user_id: userId,
          token_remaining_usage: remainingUsage
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Token-Usage': remainingUsage.toString(),
            'X-Export-Format': 'json'
          }
        })

      case 'csv':
        const csvData = convertToCSV(healthData)
        return new NextResponse(csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="health_data_${userId}_${new Date().toISOString().split('T')[0]}.csv"`,
            'X-API-Token-Usage': remainingUsage.toString(),
            'X-Export-Format': 'csv'
          }
        })

      case 'xml':
        const xmlData = convertToXML(healthData)
        return new NextResponse(xmlData, {
          headers: {
            'Content-Type': 'application/xml',
            'Content-Disposition': `attachment; filename="health_data_${userId}_${new Date().toISOString().split('T')[0]}.xml"`,
            'X-API-Token-Usage': remainingUsage.toString(),
            'X-Export-Format': 'xml'
          }
        })

      default:
        return NextResponse.json(
          { error: '不支持的导出格式' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('导出健康数据失败:', error)
    return NextResponse.json(
      { error: '数据导出失败' },
      { status: 500 }
    )
  }
}

/**
 * 将数据转换为CSV格式
 */
function convertToCSV(data: any): string {
  const csv: string[] = []

  // 导出日志数据
  if (data.logs && data.logs.length > 0) {
    csv.push('# Health Logs')
    csv.push('Date,Data')

    data.logs.forEach((log: any) => {
      csv.push(`${log.date},"${JSON.stringify(log.log_data).replace(/"/g, '""')}"`)
    })
    csv.push('')
  }

  // 导出用户配置数据
  if (data.profile) {
    csv.push('# User Profile')
    csv.push('Field,Value')

    Object.entries(data.profile).forEach(([key, value]) => {
      csv.push(`${key},"${String(value).replace(/"/g, '""')}"`)
    })
  }

  return csv.join('\n')
}

/**
 * 将数据转换为XML格式
 */
function convertToXML(data: any): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<health_data>\n'

  // 导出日志数据
  if (data.logs && data.logs.length > 0) {
    xml += '  <logs>\n'
    data.logs.forEach((log: any) => {
      xml += '    <log>\n'
      xml += `      <date>${escapeXml(log.date)}</date>\n`
      xml += `      <data>${escapeXml(JSON.stringify(log.log_data))}</data>\n`
      xml += '    </log>\n'
    })
    xml += '  </logs>\n'
  }

  // 导出用户配置数据
  if (data.profile) {
    xml += '  <profile>\n'
    Object.entries(data.profile).forEach(([key, value]) => {
      xml += `    <${key}>${escapeXml(String(value))}</${key}>\n`
    })
    xml += '  </profile>\n'
  }

  xml += '</health_data>'
  return xml
}

/**
 * XML转义函数
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case "'": return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}