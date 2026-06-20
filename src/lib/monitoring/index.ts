/**
 * Monitoring — 监控模块
 *
 * 统一对外接口，集成指标收集、健康检查、成本追踪。
 */

import { recordLLMCall, getLLMMetrics, recordAgentRun, getAgentMetrics, incrementCounter, setGauge, getMetricsSummary } from './metrics'
import { checkSystemHealth } from './health-check'
import { getCostBreakdown, checkBudget, estimateCost } from './cost-tracker'
import type { SystemHealth, CostBreakdown } from './types'

// ─── 统一监控接口 ──────────────────────────────────────────────────

/**
 * 获取完整监控数据
 */
export async function getMonitoringData(): Promise<{
  health: SystemHealth
  metrics: ReturnType<typeof getMetricsSummary>
  cost: CostBreakdown
  budget: Awaited<ReturnType<typeof checkBudget>>
}> {
  const [health, cost, budget] = await Promise.all([
    checkSystemHealth(),
    getCostBreakdown('day'),
    checkBudget(),
  ])

  return {
    health,
    metrics: getMetricsSummary(),
    cost,
    budget,
  }
}

// ─── 导出子模块 ────────────────────────────────────────────────────

export {
  // 指标
  recordLLMCall,
  getLLMMetrics,
  recordAgentRun,
  getAgentMetrics,
  incrementCounter,
  setGauge,
  getMetricsSummary,

  // 健康检查
  checkSystemHealth,

  // 成本追踪
  getCostBreakdown,
  checkBudget,
  estimateCost,
}

export type { SystemHealth, HealthCheck, HealthStatus, LLMMetric, AgentMetric, CostBreakdown } from './types'
