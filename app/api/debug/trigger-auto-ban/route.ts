import { NextRequest, NextResponse } from 'next/server';
import { checkDebugAccess } from '@/lib/debug-guard';
import { auth } from '@/lib/auth';
import { getIPBanManager } from '@/lib/ip-ban-manager';
import { getClientIP } from '@/lib/ip-utils';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs' // 明确指定使用 Node.js Runtime

export async function POST(request: NextRequest) {
  // 检查调试访问权限
  const debugCheck = checkDebugAccess();
  if (debugCheck) return debugCheck;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getClientIP(request);
    const { targetIP } = await request.json();
    const checkIP = targetIP || ip;

    // 获取数据库客户端
    const supabaseAdmin = await getSupabaseAdmin()

    // 检查最近的安全事件
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const { data: recentEvents, error } = await supabaseAdmin
      .from('security_events')
      .select('*')
      .eq('ip_address', checkIP)
      .eq('event_type', 'rate_limit_exceeded')
      .gte('created_at', tenMinutesAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 检查当前封禁状态
    const ipBanManager = getIPBanManager();
    const isBanned = await ipBanManager.isIPBanned(checkIP);

    // 手动触发自动封禁检查
    await ipBanManager.checkAndAutoBan(checkIP);

    // 再次检查封禁状态
    const isBannedAfter = await ipBanManager.isIPBanned(checkIP);

    // 获取封禁记录
    const { data: banRecords, error: banError } = await supabaseAdmin
      .from('ip_bans')
      .select('*')
      .eq('ip_address', checkIP)
      .order('banned_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      checkIP,
      recentEvents: {
        count: recentEvents.length,
        events: recentEvents.slice(0, 5) // 只返回前5个
      },
      banStatus: {
        wasBanned: isBanned,
        isBannedNow: isBannedAfter,
        triggered: !isBanned && isBannedAfter
      },
      banRecords: banRecords || [],
      autobanRules: {
        rate_limit_exceeded: {
          threshold: 5,
          timeWindow: 10,
          banDuration: 30
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Auto-ban trigger error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
