import Link from "next/link"
import { useTranslations } from 'next-intl';

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export default function NotFound() {
  const t = useTranslations('NotFound');

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>
          {t('title', { default: '页面未找到' })}
        </h1>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          {t('description', { default: '您访问的页面不存在或已被移动。' })}
        </p>
        <div style={{ marginTop: '1rem' }}>
          <Link href="/" style={{ color: '#2563eb' }}>
            {t('backHome', { default: '返回首页' })}
          </Link>
        </div>
      </div>
    </div>
  )
}
