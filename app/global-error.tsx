"use client"

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="zh-CN">
      <body>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', padding: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>发生错误</h1>
            <p style={{ color: '#666', marginTop: '0.5rem' }}>很抱歉，页面渲染时出现了问题。</p>
            {process.env.NODE_ENV !== 'production' && (
              <pre style={{ textAlign: 'left', marginTop: '1rem', color: '#b91c1c', whiteSpace: 'pre-wrap' }}>
                {error?.message}
              </pre>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
