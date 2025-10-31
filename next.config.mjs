import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 为了安全与类型收敛，生产构建不忽略类型错误
    ignoreBuildErrors: process.env.NODE_ENV !== 'production',
  },
  images: {
    unoptimized: true,
  },
  // 启用standalone输出模式，用于Docker部署
  // 根据环境变量决定是否启用
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,

  // 服务器外部包配置
  serverExternalPackages: ['pg'],

  // 在生产环境中禁用 debug 和 test 路由
  async rewrites() {
    // 基础 404 改写：所有环境统一将显式访问 /404 的路径改写到 API not-found，避免触发 pages runtime 回退
    const base404Rewrites = [
      {
        source: '/404',
        destination: '/api/not-found',
      },
      {
        source: '/404/:path*',
        destination: '/api/not-found',
      },
      {
        source: '/:locale/404',
        destination: '/api/not-found',
      },
      {
        source: '/:locale/404/:path*',
        destination: '/api/not-found',
      },
    ]

    // 在生产环境中应用更严格的重写规则（禁用 debug/test 等），并附加基础 404 改写
    if (process.env.NODE_ENV === 'production') {
      return [
        // 将所有 debug 路由重定向到 404
        {
          source: '/api/debug/:path*',
          destination: '/api/not-found',
        },
        // 将所有 test 路由重定向到 404
        {
          source: '/api/test/:path*',
          destination: '/api/not-found',
        },
        {
          source: '/api/test-:path*',
          destination: '/api/not-found',
        },
        // 将 admin test 路由重定向到 404
        {
          source: '/api/admin/test-:path*',
          destination: '/api/not-found',
        },
        {
          source: '/api/admin/security-test/:path*',
          destination: '/api/not-found',
        },
        {
          source: '/api/admin/security-simulation/:path*',
          destination: '/api/not-found',
        },
        // 将危险的修复工具重定向到 404
        {
          source: '/api/admin/fix-:path*',
          destination: '/api/not-found',
        },
        {
          source: '/admin/fix-:path*',
          destination: '/api/not-found',
        },
        // 将 shared-keys test 路由重定向到 404
        {
          source: '/api/shared-keys/test/:path*',
          destination: '/api/not-found',
        },
        // 将测试页面路由重定向到 404
        {
          source: '/:locale/test-captcha',
          destination: '/api/not-found',
        },
        {
          source: '/:locale/test-tab-freeze',
          destination: '/api/not-found',
        },
        // 将调试页面路由重定向到 404
        {
          source: '/debug/:path*',
          destination: '/api/not-found',
        },
        // 将测试 API 路由重定向到 404
        {
          source: '/api/test',
          destination: '/api/not-found',
        },
        {
          source: '/api/test-auth',
          destination: '/api/not-found',
        },
        {
          source: '/api/test-model',
          destination: '/api/not-found',
        },
        {
          source: '/api/test-rate-limit',
          destination: '/api/not-found',
        },
        // verify-email 是正常功能，不应该被禁用
        // 只禁用纯测试页面

        // 统一附加基础 404 改写，避免 pages runtime 回退
        ...base404Rewrites,
      ];
    }
    // 非生产环境也保持与生产一致的 /404 行为，减少环境差异
    return base404Rewrites;
  },

  // 为 not-found API 设置不缓存，防止 CDN/浏览器缓存 404 响应
  async headers() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/api/not-found',
          headers: [
            { key: 'Cache-Control', value: 'no-store' },
          ],
        },
        {
          source: '/api/not-found/:path*',
          headers: [
            { key: 'Cache-Control', value: 'no-store' },
          ],
        },
        // 统一为 API 预检提供允许的 CORS 头（按需扩展）
        {
          source: '/api/:path*',
          headers: [
            { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS, PATCH' },
            { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-API-Key' },
            { key: 'Access-Control-Max-Age', value: '86400' },
            { key: 'Vary', value: 'Origin' },
          ],
        },
      ];
    }
    return [];
  },

  // Webpack 配置
  webpack: (config, { webpack, isServer }) => {
    // 使用 IgnorePlugin 忽略 PostgreSQL 相关模块
    config.plugins.push(new webpack.IgnorePlugin({
      resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
    }))

    // 在生产环境中忽略测试页面和调试模块
    if (process.env.NODE_ENV === 'production') {
      // 忽略调试和测试页面
      config.plugins.push(new webpack.IgnorePlugin({
        resourceRegExp: /test-captcha|test-tab-freeze/,
        contextRegExp: /app\/\[locale\]/,
      }))

      // 忽略整个 debug 目录
      config.plugins.push(new webpack.IgnorePlugin({
        resourceRegExp: /.*/,
        contextRegExp: /app\/debug/,
      }))

      // 忽略 API debug 目录
      config.plugins.push(new webpack.IgnorePlugin({
        resourceRegExp: /.*/,
        contextRegExp: /app\/api\/debug/,
      }))

      // 忽略测试相关的 API 路由
      config.plugins.push(new webpack.IgnorePlugin({
        resourceRegExp: /test-auth|test-model|test-rate-limit|^test$/,
        contextRegExp: /app\/api/,
      }))
    }

    // 在客户端构建中忽略 PostgreSQL 相关模块
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'pg': false,
        'pg-native': false,
        'pg-cloudflare': false,
        'cloudflare:sockets': false,
      }

      // 忽略 PostgreSQL 相关的模块
      config.externals = config.externals || []
      config.externals.push({
        'pg': 'commonjs pg',
        'pg-native': 'commonjs pg-native',
        'pg-cloudflare': 'commonjs pg-cloudflare',
      })
    }

    return config
  },
}

export default withNextIntl(nextConfig);
