"use client"

import { useEffect, useId, useState } from 'react'
import Script from 'next/script'

declare global {
  interface Window {
    mermaid?: any
  }
}

export function Mermaid({ chart, className }: { chart: string; className?: string }) {
  const [ready, setReady] = useState(false)
  const [svg, setSvg] = useState<string>("")
  const id = useId().replace(/[:]/g, '')

  useEffect(() => {
    if (!ready || !window.mermaid) return
    try {
      window.mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' })
      window.mermaid.render(`mermaid-${id}`, chart).then((res: any) => {
        setSvg(res.svg as string)
      })
    } catch (e) {
      console.error('Mermaid 渲染失败:', e)
    }
  }, [ready, chart, id])

  return (
    <div className={className}>
      <Script
        src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      {svg ? (
        <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap">{chart}</pre>
      )}
    </div>
  )
}




