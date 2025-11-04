type PageProps = {
  params?: Promise<{ locale?: string | string[] }>
}

export default async function Page(props: PageProps) {
  const resolved = (props.params ? await props.params : {}) as {
    locale?: string | string[]
  }
  const locale = Array.isArray(resolved.locale)
    ? resolved.locale[0]
    : resolved.locale ?? 'default'
  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold mb-2">MCP Diagrams 占位页</h1>
      <p className="text-sm text-gray-600">
        当前语言：<span className="font-mono">{locale}</span>。该文档页面已被占位，后续内容待补充。
      </p>
    </div>
  )
}




