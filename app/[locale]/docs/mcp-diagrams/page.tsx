import fs from 'fs/promises'
import path from 'path'
import { MarkdownRenderer } from '@/components/markdown-renderer'

type PageProps = { params: { locale: string } }

export default async function Page(_props: PageProps) {
  const filePath = path.join(process.cwd(), 'docs', 'MCP-DIAGRAMS.md')
  let content = '# MCP 架构与调用时序图\n\n未找到 `docs/MCP-DIAGRAMS.md` 文件。'
  try {
    content = await fs.readFile(filePath, 'utf-8')
  } catch {}

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">MCP 架构与时序图</h1>
      <MarkdownRenderer content={content} />
    </div>
  )
}




