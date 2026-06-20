/**
 * Metrics Collector — 指标收集器
 *
 * 收集和聚合系统运行指标：
 *   - LLM 调用指标（成功率、延迟、Token、成本）
 *   - Agent 运行指标（成功率、置信度、工具调用）
 *   - 系统指标（队列深度、错误率、内存使用）
 *
 * 数据存储在内存中，定期刷新到数据库。
 */

import type { LLMMetric, AgentMetric, HistogramMetric } from './types'

// ─── 内存存储 ──────────────────────────────────────────────────────

const llmMetrics = new Map<string, {
  calls: number
  successes: number
  failures: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  totalCostUsd: number
  latencies: number[]
}>()

const agentMetrics = new Map<string, {
  runs: number
  successes: number
  failures: number
  confidences: number[]
  durations: number[]
  toolCalls: number
}>()

const counters = new Map<string, number>()
const gauges = new Map<string, number>()
const histograms = new Map<string, number[]>()

const startTime = Date.now()

// ─── LLM 指标 ──────────────────────────────────────────────────────

/**
 * 记录 LLM 调用
 */
export function recordLLMCall(
  provider: string,
  model: string,
  success: boolean,
  inputTokens: number,
  outputTokens: number,
  costUsd: number,
  latencyMs: number,
): void {
  const key = `${provider}:${model}`
  const existing = llmMetrics.get(key) ?? {
    calls: 0, successes: 0, failures: 0,
    totalTokens: 0, inputTokens: 0, outputTokens: 0,
    totalCostUsd: 0, latencies: [],
  }

  existing.calls++
  if (success) existing.successes++
  else existing.failures++
  existing.totalTokens += inputTokens + outputTokens
  existing.inputTokens += inputTokens
  existing.outputTokens += outputTokens
  existing.totalCostUsd += costUsd
  existing.latencies.push(latencyMs)

  // 保持最近 1000 条
  if (existing.latencies.length > 1000) {
    existing.latencies = existing.latencies.slice(-1000)
  }

  llmMetrics.set(key, existing)
}

/**
 * 获取 LLM 指标
 */
export function getLLMMetrics(): LLMMetric[] {
  const metrics: LLMMetric[] = []

  for (const [key, data] of llmMetrics) {
    const [provider, model] = key.split(':')
    const sortedLatencies = [...data.latencies].sort((a, b) => a - b)

    metrics.push({
      provider,
      model,
      totalCalls: data.calls,
      successCalls: data.successes,
      failedCalls: data.failures,
      totalTokens: data.totalTokens,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalCostUsd: data.totalCostUsd,
      avgLatencyMs: data.calls > 0 ? data.latencies.reduce((a, b) => a + b, 0) / data.calls : 0,
      p95LatencyMs: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] ?? 0,
      errorRate: data.calls > 0 ? data.failures / data.calls : 0,
    })
  }

  return metrics
}

// ─── Agent 指标 ────────────────────────────────────────────────────

/**
 * 记录 Agent 运行
 */
export function recordAgentRun(
  agentId: string,
  success: boolean,
  confidence: number,
  durationMs: number,
  toolCalls: number = 0,
): void {
  const existing = agentMetrics.get(agentId) ?? {
    runs: 0, successes: 0, failures: 0,
    confidences: [], durations: [], toolCalls: 0,
  }

  existing.runs++
  if (success) existing.successes++
  else existing.failures++
  existing.confidences.push(confidence)
  existing.durations.push(durationMs)
  existing.toolCalls += toolCalls

  // 保持最近 1000 条
  if (existing.confidences.length > 1000) {
    existing.confidences = existing.confidences.slice(-1000)
    existing.durations = existing.durations.slice(-1000)
  }

  agentMetrics.set(agentId, existing)
}

/**
 * 获取 Agent 指标
 */
export function getAgentMetrics(): AgentMetric[] {
  const metrics: AgentMetric[] = []

  for (const [agentId, data] of agentMetrics) {
    metrics.push({
      agentId,
      totalRuns: data.runs,
      successRuns: data.successes,
      failedRuns: data.failures,
      avgConfidence: data.confidences.length > 0
        ? data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length
        : 0,
      avgDurationMs: data.durations.length > 0
        ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
        : 0,
      totalToolCalls: data.toolCalls,
      errorRate: data.runs > 0 ? data.failures / data.runs : 0,
    })
  }

  return metrics
}

// ─── 通用计数器 ────────────────────────────────────────────────────

/**
 * 增加计数器
 */
export function incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
  const key = labels ? `${name}:${JSON.stringify(labels)}` : name
  counters.set(key, (counters.get(key) ?? 0) + value)
}

/**
 * 获取计数器
 */
export function getCounter(name: string): number {
  return counters.get(name) ?? 0
}

// ─── 通用仪表盘 ────────────────────────────────────────────────────

/**
 * 设置仪表盘值
 */
export function setGauge(name: string, value: number): void {
  gauges.set(name, value)
}

/**
 * 获取仪表盘值
 */
export function getGauge(name: string): number {
  return gauges.get(name) ?? 0
}

// ─── 通用直方图 ────────────────────────────────────────────────────

/**
 * 记录直方图值
 */
export function recordHistogram(name: string, value: number): void {
  const existing = histograms.get(name) ?? []
  existing.push(value)
  if (existing.length > 1000) {
    existing.splice(0, existing.length - 1000)
  }
  histograms.set(name, existing)
}

/**
 * 获取直方图统计
 */
export function getHistogram(name: string): HistogramMetric | null {
  const values = histograms.get(name)
  if (!values || values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)
  const sum = sorted.reduce((a, b) => a + b, 0)

  return {
    name,
    count: sorted.length,
    sum,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  }
}

// ─── 系统指标 ──────────────────────────────────────────────────────

/**
 * 获取系统运行时间
 */
export function getUptime(): number {
  return Date.now() - startTime
}

/**
 * 获取所有指标摘要
 */
export function getMetricsSummary(): {
  uptime: number
  llmMetrics: LLMMetric[]
  agentMetrics: AgentMetric[]
  counters: Record<string, number>
  gauges: Record<string, number>
} {
  const countersObj: Record<string, number> = {}
  for (const [key, value] of counters) {
    countersObj[key] = value
  }

  const gaugesObj: Record<string, number> = {}
  for (const [key, value] of gauges) {
    gaugesObj[key] = value
  }

  return {
    uptime: getUptime(),
    llmMetrics: getLLMMetrics(),
    agentMetrics: getAgentMetrics(),
    counters: countersObj,
    gauges: gaugesObj,
  }
}
