import Link from "next/link"

export default function NotFound() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>页面未找到</h1>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>您访问的页面不存在或已被移动。</p>
        <div style={{ marginTop: '1rem' }}>
          <Link href="/" style={{ color: '#2563eb' }}>返回首页</Link>
        </div>
      </div>
    </div>
  )
}
