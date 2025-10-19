import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n';
import { getClientIP } from './lib/ip-utils';
import { checkRequestSize } from './lib/request-size-limiter';
import { addSecurityHeaders, addCorsHeaders } from './middleware-security-headers';
import { EnvConfig } from './lib/env-config';
import { getVersion } from './config/features';

// 娉ㄦ剰锛氭暟鎹簱鐩稿叧妫€鏌ュ凡绉诲埌鍚勮嚜鐨?API 璺敱涓鐞?

// 瀹夊叏閰嶇疆
const SECURITY_CONFIG = {
  // 鏈€澶ц姹傚ぇ灏忥紙瀛楄妭锛?
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  // 鏈€澶?User-Agent 闀垮害
  maxUserAgentLength: 512,
  // 鏈€澶?IP 鍦板潃闀垮害
  maxIpLength: 45, // IPv6 鏈€澶ч暱搴?
  // 鏁忔劅淇℃伅杩囨护
  sensitiveHeaders: ['authorization', 'cookie', 'x-api-key'],
};

// 杈撳叆楠岃瘉鍜屾竻鐞嗗嚱鏁?
function sanitizeInput(input: string, maxLength: number): string {
  if (!input || typeof input !== 'string') return '';

  // 绉婚櫎娼滃湪鐨勫嵄闄╁瓧绗?
  const cleaned = input
    .replace(/[<>'"&]/g, '') // 绉婚櫎 HTML/JS 娉ㄥ叆瀛楃
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // 绉婚櫎鎺у埗瀛楃
    .trim();

  // 闄愬埗闀垮害
  return cleaned.length > maxLength ? cleaned.substring(0, maxLength) : cleaned;
}

// 楠岃瘉 IP 鍦板潃鏍煎紡
function isValidIP(ip: string): boolean {
  if (!ip || ip.length > SECURITY_CONFIG.maxIpLength) return false;

  // IPv4 姝ｅ垯
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  // IPv6 姝ｅ垯锛堢畝鍖栫増锛?
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === '::1' || ip === '127.0.0.1';
}

// 瀹夊叏鐨勯敊璇搷搴旓紙涓嶆硠闇茬郴缁熶俊鎭級
function createSecureErrorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    {
      error: 'Request blocked',
      message: sanitizeInput(message, 100),
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * 寮傛璁板綍瀹夊叏浜嬩欢鍒版暟鎹簱锛堥潪闃诲锛?
 */
async function logSecurityEventAsync(event: {
  ipAddress: string;
  userAgent?: string;
  eventType: string;
  severity: string;
  description: string;
  metadata?: Record<string, any>;
  userId?: string;
}) {
  try {
    // 杈撳叆楠岃瘉鍜屾竻鐞?
    const cleanEvent = {
      ipAddress: sanitizeInput(event.ipAddress, SECURITY_CONFIG.maxIpLength),
      userAgent: event.userAgent ? sanitizeInput(event.userAgent, SECURITY_CONFIG.maxUserAgentLength) : 'unknown',
      eventType: sanitizeInput(event.eventType, 50),
      severity: sanitizeInput(event.severity, 20),
      description: sanitizeInput(event.description, 500),
      userId: event.userId ? sanitizeInput(event.userId, 100) : undefined,
    };

    // 楠岃瘉 IP 鍦板潃
    if (!isValidIP(cleanEvent.ipAddress)) {
      console.warn('Invalid IP address in security event:', event.ipAddress);
      return;
    }

    // 璁板綍鍒版帶鍒跺彴
    console.log('Security Event:', {
      ip: cleanEvent.ipAddress,
      type: cleanEvent.eventType,
      severity: cleanEvent.severity,
      description: cleanEvent.description,
      timestamp: new Date().toISOString()
    });

    // 寮傛璁板綍鍒版暟鎹簱锛堥潪闃诲锛?
    fetch('/api/security/log-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Request': 'true',
      },
      body: JSON.stringify(cleanEvent),
    }).catch(error => {
      console.error('Failed to log security event to database:', error);
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// 浠庤姹備腑鎻愬彇鍩烘湰淇℃伅锛堜笉娑夊強鏁版嵁搴撴搷浣滐級
function extractRequestInfo(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const userAgent = req.headers.get('user-agent') || 'unknown';

  return {
    hasAuthToken: authHeader?.startsWith('Bearer ') || false,
    userAgent: sanitizeInput(userAgent, SECURITY_CONFIG.maxUserAgentLength),
    path: req.nextUrl.pathname,
    method: req.method,
  };
}

// 鍔ㄦ€侀€熺巼闄愬埗閰嶇疆锛堟敮鎸佺幆澧冨彉閲忔帶鍒讹級
function getRateLimitConfig() {
  const rateLimits = EnvConfig.rateLimits;
  return {
    // 鍚屾API闄愬埗锛氭瘡鍒嗛挓璇锋眰鏁帮紙鍦ㄤ笓鐢ㄩ檺鍒跺櫒涓繕鏈夋洿缁嗙矑搴︾殑鎺у埗锛?
    sync: { requests: rateLimits.sync, window: 60 * 1000 },
    // AI API闄愬埗锛氭瘡鍒嗛挓璇锋眰鏁?
    ai: { requests: rateLimits.ai, window: 60 * 1000 },
    // 涓婁紶璺敱闄愬埗锛氭瘡鍒嗛挓璇锋眰鏁?
    upload: { requests: rateLimits.upload, window: 60 * 1000 },
    // 绠＄悊API闄愬埗锛氭瘡鍒嗛挓璇锋眰鏁?
    admin: { requests: rateLimits.admin, window: 60 * 1000 },
    // 璁よ瘉API闄愬埗锛氭瘡鍒嗛挓璇锋眰鏁帮紙session鏌ヨ棰戠箒锛?
    auth: { requests: rateLimits.auth, window: 60 * 1000 },
    // 涓€鑸珹PI闄愬埗锛氭瘡鍒嗛挓璇锋眰鏁?
    api: { requests: rateLimits.api, window: 60 * 1000 },
    // 鍏ㄥ眬闄愬埗锛氭瘡鍒嗛挓璇锋眰鏁?
    global: { requests: rateLimits.global, window: 60 * 1000 }
  };
}

// 鍐呭瓨涓殑閫熺巼闄愬埗瀛樺偍锛堢敓浜х幆澧冨缓璁娇鐢≧edis锛?
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// 鐢ㄦ埛绾у埆鐨勯€熺巼闄愬埗瀛樺偍
const userRateLimitStore = new Map<string, { count: number; resetTime: number }>();

// 娓呯悊杩囨湡鐨勯€熺巼闄愬埗璁板綍
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
  for (const [key, value] of userRateLimitStore.entries()) {
    if (now > value.resetTime) {
      userRateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // 姣忓垎閽熸竻鐞嗕竴娆?



// 娉ㄦ剰锛氱淮鎶ゆā寮忓拰 IP 灏佺妫€鏌ュ凡绉诲埌 API 璺敱涓鐞?
// 涓棿浠剁幇鍦ㄥ彧澶勭悊鍩烘湰鐨勯€熺巼闄愬埗鍜岃姹傞獙璇?

function getApiCategory(path: string): keyof typeof RATE_LIMIT_CONFIG {
  if (path.startsWith('/api/sync/')) return 'sync';
  if (path.startsWith('/api/ai/') || path.startsWith('/api/openai/')) return 'ai';
  if (path.startsWith('/api/admin/')) return 'admin';
  if (path.startsWith('/api/auth/')) return 'auth';
  if (path.includes('upload') || path.includes('image')) return 'upload';
  if (path.startsWith('/api/')) return 'api';
  return 'global';
}

// getClientIP 鍑芥暟宸茬Щ鍔ㄥ埌 lib/ip-utils.ts

async function checkRateLimit(req: NextRequest): Promise<NextResponse | null> {
  // 馃敡 妫€鏌ユ槸鍚﹀惎鐢ㄩ€熺巼闄愬埗
  if (!EnvConfig.enableRateLimit) {
    return null; // 閫熺巼闄愬埗琚鐢紝鐩存帴閫氳繃
  }

  const ip = getClientIP(req);
  const path = req.nextUrl.pathname;
  const isInternal = req.headers.get('X-Internal-Request') === 'true';
  if (isInternal || path === '/api/security/log-event') {
    return null;
  }

  // 楠岃瘉 IP 鍦板潃
  if (!isValidIP(ip)) {
    logSecurityEventAsync({
      ipAddress: ip,
      eventType: 'invalid_ip',
      severity: 'high',
      description: 'Invalid IP address detected',
      userAgent: req.headers.get('user-agent') || 'unknown'
    });
    return createSecureErrorResponse('Invalid request', 400);
  }

  // 馃敀 杩涜閫熺巼闄愬埗妫€鏌?
  const category = getApiCategory(path);
  const rateLimitConfig = getRateLimitConfig();
  const config = rateLimitConfig[category];

  // 鍒涘缓鏇寸簿纭殑闄愬埗閿細IP + 鍏蜂綋璺緞
  const limitKey = `${ip}:${path}`;
  const now = Date.now();

  // 妫€鏌P绾у埆闄愬埗
  const ipRecord = rateLimitStore.get(limitKey);

  if (!ipRecord || now > ipRecord.resetTime) {
    // 鍒涘缓鏂拌褰曟垨閲嶇疆杩囨湡璁板綍
    rateLimitStore.set(limitKey, {
      count: 1,
      resetTime: now + config.window
    });
  } else {
    if (ipRecord.count >= config.requests) {
      // 鑾峰彇璇锋眰淇℃伅
      const requestInfo = extractRequestInfo(req);

      // 璁板綍閫熺巼闄愬埗杩濊
      logSecurityEventAsync({
        ipAddress: ip,
        userAgent: requestInfo.userAgent,
        eventType: 'rate_limit_exceeded',
        severity: 'medium',
        description: `Rate limit exceeded for ${category} API: ${path}`,
        metadata: {
          path,
          category,
          limit: config.requests,
          window: config.window,
          attempts: ipRecord.count + 1,
          hasAuthToken: requestInfo.hasAuthToken
        }
      });

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((ipRecord.resetTime - now) / 1000),
          category,
          limit: config.requests
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.requests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(ipRecord.resetTime / 1000).toString(),
            'X-RateLimit-Category': category,
            'Retry-After': Math.ceil((ipRecord.resetTime - now) / 1000).toString()
          }
        }
      );
    }

    // 澧炲姞璁℃暟
    ipRecord.count++;
    rateLimitStore.set(limitKey, ipRecord);
  }

  return null;
}

const intlMiddleware = createMiddleware({
  // 鏀寔鐨勮瑷€鍒楄〃
  locales,
  // 榛樿璇█
  defaultLocale,
  // 濮嬬粓鏄剧ず璇█鍓嶇紑锛岀‘淇濊瑷€鐘舵€佺ǔ瀹?
  localePrefix: 'always',
  // 璇█妫€娴嬬瓥鐣?
  localeDetection: true
});

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const origin = req.headers.get('origin') || undefined;
  const isInternal = req.headers.get('X-Internal-Request') === 'true';
  if (isInternal || path === '/api/security/log-event') {
    return null;
  }

  // 馃敀 绗竴灞傦細璇锋眰澶у皬妫€鏌ワ紙闃叉瓒呭ぇ璇锋眰鏀诲嚮锛?
  const sizeCheckResponse = await checkRequestSize(req);
  if (sizeCheckResponse) {
    return sizeCheckResponse;
  }

  // 馃敀 绗簩灞傦細IP绾у埆鐨勯€熺巼闄愬埗锛堜繚鎶よ璇佺鐐癸級
  const securityResponse = await checkRateLimit(req);
  if (securityResponse) {
    return securityResponse;
  }

  // 馃毇 API璺敱涓嶉渶瑕佸浗闄呭寲澶勭悊锛屼絾闇€瑕佹坊鍔犲畨鍏ㄥご
  // 娉ㄦ剰锛氭暟鎹簱鐩稿叧鐨勬鏌ワ紙IP灏佺銆佺敤鎴峰皝绂併€佺淮鎶ゆā寮忥級宸茬Щ鍒板悇鑷殑 API 璺敱涓鐞?  if (path.startsWith('/api/')) {
    // 涓汉浣撻獙鐗堬紙IndexedDB锛変笉鎻愪緵鏈嶅姟绔暟鎹簱/API
    const version = (getVersion && typeof getVersion === 'function') ? getVersion() : 'community'
    const personalMode = process.env.PERSONAL_DB_MODE || 'indexeddb'
    if (version === 'personal' && personalMode === 'indexeddb') {
      return NextResponse.json(
        {
          error: 'SERVER_DB_DISABLED',
          message: '涓汉浣撻獙鐗堬紙IndexedDB锛変笉鎻愪緵鏈嶅姟绔帴鍙ｏ紝璇蜂娇鐢ㄥ墠绔湰鍦板瓨鍌ㄦ垨瀵煎叆/瀵煎嚭鍔熻兘',
        },
        { status: 405 }
      )
    }

    const response = NextResponse.next();
    const origin = req.headers.get('origin') || undefined;
    return addCorsHeaders(addSecurityHeaders(response), origin);
  }

  // 馃寪 瀵归潪API璺敱杩涜鍥介檯鍖栧鐞嗗苟娣诲姞瀹夊叏澶?
  const response = intlMiddleware(req);
  return addSecurityHeaders(response);
}

// 娉ㄦ剰锛氬叕鍏盇PI璺緞鐨勫垽鏂凡绉诲埌鍚勮嚜鐨?API 璺敱涓鐞?

export const config = {
  // 鍖归厤鎵€鏈夎矾寰勶紝闄や簡浠ヤ笅璺緞锛?
  // - _next 闈欐€佹枃浠?
  // - _vercel 閮ㄧ讲鏂囦欢
  // - 闈欐€佽祫婧愭枃浠?
  matcher: ['/((?!_next|_vercel|.*\\..*).*)', '/api/(.*)']
};



