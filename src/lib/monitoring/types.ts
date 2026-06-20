/**
 * Monitoring Types — 监控类型定义
 */

// ─── 指标 ──────────────────────────────────────────────────────────

export interface MetricPoint {
  name: string
  value: number
  timestamp: string
  labels?: Record<string, string>
}

export interface CounterMetric {
  name: string
  value: number
  labels?: Record<string, string>
}

export interface GaugeMetric {
  name: string
  value: number
  min?: number
  max?: number
  labels?: Record<string, string>
}

export interface HistogramMetric {
  name: string
  count: number
  sum: number
  min: number
  max: number
  avg: number
  p50: number
  p95: number
  p99: number
}

// ─── LLM 监控 ──────────────────────────────────────────────────────

export interface LLMMetric {
  provider: string
  model: string
  totalCalls: number
  successCalls: number
  failedCalls: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  totalCostUsd: number
  avgLatencyMs: number
  p95LatencyMs: number
  errorRate: number
}

// ─── Agent 监控 ────────────────────────────────────────────────────

export interface AgentMetric {
  agentId: string
  totalRuns: number
  successRuns: number
  failedRuns: number
  avgConfidence: number
  avgDurationMs: number
  totalToolCalls: number
  errorRate: number
}

// ─── 系统健康 ──────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface HealthCheck {
  name: string
  status: HealthStatus
  message: string
  durationMs: number
  timestamp: string
}

export interface SystemHealth {
  status: HealthStatus
  checks: HealthCheck[]
  uptime: number
  timestamp: string
}

// ─── 成本追踪 ──────────────────────────────────────────────────────

export interface CostBreakdown {
  byProvider: Record<string, number>
  byModel: Record<string, number>
  byAgent: Record<string, number>
  totalCostUsd: number
  period: 'hour' | 'day' | 'week' | 'month'
}
