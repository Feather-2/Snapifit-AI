import { notFound } from "next/navigation"

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export default function NotFoundPage() {
  // 始终委托给 App Router 的全局 not-found 页面，避免 pages runtime 回退
  notFound()
}
