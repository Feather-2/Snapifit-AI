type LabelSet = Record<string, string>

function serializeLabels(labels: LabelSet): string {
  const keys = Object.keys(labels).sort()
  return keys.map(k => `${k}="${labels[k].replace(/"/g, '\\"')}"`).join(',')
}

class MetricsRegistry {
  private counters: Map<string, number> = new Map()
  private sums: Map<string, number> = new Map()
  private counts: Map<string, number> = new Map()

  incCounter(name: string, labels: LabelSet = {}, value = 1) {
    const key = `${name}{${serializeLabels(labels)}}`
    this.counters.set(key, (this.counters.get(key) || 0) + value)
  }

  observe(name: string, labels: LabelSet = {}, value: number) {
    const sumKey = `${name}_sum{${serializeLabels(labels)}}`
    const countKey = `${name}_count{${serializeLabels(labels)}}`
    this.sums.set(sumKey, (this.sums.get(sumKey) || 0) + value)
    this.counts.set(countKey, (this.counts.get(countKey) || 0) + 1)
  }

  toPrometheus(): string {
    const lines: string[] = []
    // Counters
    for (const [key, val] of this.counters.entries()) {
      lines.push(`# TYPE ${key.split('{')[0]} counter`)
      lines.push(`${key} ${val}`)
    }
    // Summaries (sum/count pairs)
    for (const [key, val] of this.sums.entries()) {
      lines.push(`# TYPE ${key.split('{')[0]} summary`)
      lines.push(`${key} ${val}`)
    }
    for (const [key, val] of this.counts.entries()) {
      lines.push(`${key} ${val}`)
    }
    return lines.join('\n') + '\n'
  }
}

let registry: MetricsRegistry | null = null
function getRegistry(): MetricsRegistry {
  if (!registry) registry = new MetricsRegistry()
  return registry
}

export function recordToolCall(data: {
  providerId: string
  providerName?: string
  tool: string
  success: boolean
  durationMs?: number
  resultBytes?: number
}) {
  const labels: LabelSet = {
    providerId: data.providerId,
    providerName: data.providerName || 'unknown',
    tool: data.tool,
    success: String(!!data.success)
  }
  const reg = getRegistry()
  reg.incCounter('mcp_tool_calls_total', labels, 1)
  if (typeof data.durationMs === 'number') {
    reg.observe('mcp_tool_duration_ms', labels, data.durationMs)
  }
  if (typeof data.resultBytes === 'number') {
    reg.observe('mcp_tool_result_bytes', labels, data.resultBytes)
  }
}

export function recordHealthCheck(data: {
  providerId: string
  healthy: boolean
  durationMs?: number
}) {
  const labels: LabelSet = {
    providerId: data.providerId,
    healthy: String(!!data.healthy)
  }
  const reg = getRegistry()
  reg.incCounter('mcp_health_checks_total', labels, 1)
  if (typeof data.durationMs === 'number') {
    reg.observe('mcp_health_check_duration_ms', labels, data.durationMs)
  }
}

export function getPrometheusMetricsText(): string {
  return getRegistry().toPrometheus()
}


