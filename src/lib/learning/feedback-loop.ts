/**
 * Learning Feedback Loop — 自我改进闭环
 *
 * 跟踪路由决策和 Agent 执行结果，分析性能模式，动态调整路由权重。
 *
 * 核心流程：
 *   1. 记录每次路由决策（router → agent）
 *   2. 记录每次 Agent 执行结果（成功/失败/置信度）
 *   3. 定期分析性能模式（哪些 Agent 擅长哪些任务类型）
 *   4. 生成路由权重调整建议
 *   5. 暴露给路由器使用
 *
 * 安全：
 *   - 只记录聚合统计，不存储原始任务内容
 *   - 权重调整有上限（防止单一 Agent 过度偏向）
 *   - 最近 100 次决策的滑动窗口
 */

// ─── 类型定义 ──────────────────────────────────────────────────────

export interface RoutingRecord {
  id: string
  timestamp: string
  /** 路由决策的 Agent ID */
  agentId: string
  /** 任务类型 */
  taskType: string
  /** 路由置信度 */
  routeConfidence: number
  /** Agent 执行状态 */
  executionStatus: 'completed' | 'failed' | 'blocked' | 'timeout'
  /** Agent 执行置信度 */
  executionConfidence: number
  /** 执行耗时毫秒 */
  durationMs: number
  /** 匹配的信号 */
  matchedSignals: string[]
}

export interface AgentPerformanceStats {
  agentId: string
  /** 总执行次数 */
  totalExecutions: number
  /** 成功次数 */
  successCount: number
  /** 失败次数 */
  failureCount: number
  /** 成功率 */
  successRate: number
  /** 平均置信度 */
  avgConfidence: number
  /** 平均耗时毫秒 */
  avgDurationMs: number
  /** 擅长的任务类型（按成功率排序） */
  strongestTaskTypes: Array<{ type: string; successRate: number; count: number }>
  /** 薄弱的任务类型（按成功率排序） */
  weakestTaskTypes: Array<{ type: string; successRate: number; count: number }>
}

export interface RoutingWeightAdjustment {
  agentId: string
  taskType: string
  /** 当前权重 */
  currentWeight: number
  /** 建议权重 */
  suggestedWeight: number
  /** 调整原因 */
  reason: string
  /** 基于多少次决策 */
  sampleSize: number
}

// ─── 滑动窗口存储 ──────────────────────────────────────────────────

const MAX_RECORDS = 100
const records: RoutingRecord[] = []
let recordIdCounter = 0

/**
 * 记录路由决策和执行结果
 */
export function recordRoutingOutcome(outcome: Omit<RoutingRecord, 'id' | 'timestamp'>): RoutingRecord {
  const record: RoutingRecord = {
    id: `rr-${++recordIdCounter}`,
    timestamp: new Date().toISOString(),
    ...outcome,
  }

  records.push(record)

  // 滑动窗口：保持最近 MAX_RECORDS 条
  if (records.length > MAX_RECORDS) {
    records.shift()
  }

  return record
}

/**
 * 获取所有记录（用于分析）
 */
export function getRoutingRecords(): readonly RoutingRecord[] {
  return records
}

/**
 * 清空记录（仅测试用）
 */
export function clearRoutingRecords(): void {
  records.length = 0
}

// ─── 性能分析 ──────────────────────────────────────────────────────

/**
 * 分析所有 Agent 的性能统计
 */
export function analyzeAgentPerformance(): AgentPerformanceStats[] {
  const agentMap = new Map<string, RoutingRecord[]>()

  for (const record of records) {
    const existing = agentMap.get(record.agentId) ?? []
    existing.push(record)
    agentMap.set(record.agentId, existing)
  }

  const stats: AgentPerformanceStats[] = []

  for (const [agentId, agentRecords] of agentMap) {
    const total = agentRecords.length
    const successCount = agentRecords.filter((r) => r.executionStatus === 'completed').length
    const failureCount = agentRecords.filter((r) => r.executionStatus === 'failed').length
    const successRate = total > 0 ? successCount / total : 0
    const avgConfidence = total > 0
      ? agentRecords.reduce((sum, r) => sum + r.executionConfidence, 0) / total
      : 0
    const avgDurationMs = total > 0
      ? agentRecords.reduce((sum, r) => sum + r.durationMs, 0) / total
      : 0

    // 按任务类型分组分析
    const typeMap = new Map<string, RoutingRecord[]>()
    for (const record of agentRecords) {
      const existing = typeMap.get(record.taskType) ?? []
      existing.push(record)
      typeMap.set(record.taskType, existing)
    }

    const typeStats = Array.from(typeMap.entries()).map(([type, typeRecords]) => {
      const typeSuccess = typeRecords.filter((r) => r.executionStatus === 'completed').length
      return {
        type,
        successRate: typeRecords.length > 0 ? typeSuccess / typeRecords.length : 0,
        count: typeRecords.length,
      }
    })

    const strongestTaskTypes = [...typeStats]
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 3)

    const weakestTaskTypes = [...typeStats]
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, 3)

    stats.push({
      agentId,
      totalExecutions: total,
      successCount,
      failureCount,
      successRate,
      avgConfidence,
      avgDurationMs,
      strongestTaskTypes,
      weakestTaskTypes,
    })
  }

  return stats.sort((a, b) => b.successRate - a.successRate)
}

// ─── 路由权重调整 ──────────────────────────────────────────────────

/** 默认路由权重（所有 Agent 等权） */
const DEFAULT_WEIGHT = 1.0

/** 权重上下限 */
const MIN_WEIGHT = 0.3
const MAX_WEIGHT = 2.0

/** 最小样本数（低于此数不调整） */
const MIN_SAMPLE_SIZE = 5

/**
 * 计算路由权重调整建议
 *
 * 基于历史性能数据，为每个 (agentId, taskType) 对计算建议权重。
 */
export function computeRoutingAdjustments(): RoutingWeightAdjustment[] {
  const adjustments: RoutingWeightAdjustment[] = []
  const agentStats = analyzeAgentPerformance()

  // 收集所有 (agentId, taskType) 组合
  const combinations = new Map<string, { agentId: string; taskType: string; records: RoutingRecord[] }>()

  for (const record of records) {
    const key = `${record.agentId}:${record.taskType}`
    const existing = combinations.get(key)
    if (existing) {
      existing.records.push(record)
    } else {
      combinations.set(key, { agentId: record.agentId, taskType: record.taskType, records: [record] })
    }
  }

  for (const [key, combo] of combinations) {
    const [agentId, taskType] = key.split(':')

    // 样本数不足，不调整
    if (combo.records.length < MIN_SAMPLE_SIZE) continue

    // 计算该组合的成功率
    const successCount = combo.records.filter((r) => r.executionStatus === 'completed').length
    const successRate = successCount / combo.records.length

    // 计算全局平均成功率
    const globalStats = agentStats.find((s) => s.agentId === agentId)
    const globalSuccessRate = globalStats?.successRate ?? 0.5

    // 计算建议权重
    // 如果该组合的成功率高于全局平均，增加权重；反之降低
    const ratio = globalSuccessRate > 0 ? successRate / globalSuccessRate : 1.0
    let suggestedWeight = DEFAULT_WEIGHT * ratio

    // 限制在上下限内
    suggestedWeight = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, suggestedWeight))
    suggestedWeight = Math.round(suggestedWeight * 100) / 100

    // 如果调整幅度太小，跳过
    if (Math.abs(suggestedWeight - DEFAULT_WEIGHT) < 0.1) continue

    const reason = successRate > globalSuccessRate
      ? `Above-average success rate (${(successRate * 100).toFixed(0)}% vs global ${(globalSuccessRate * 100).toFixed(0)}%)`
      : `Below-average success rate (${(successRate * 100).toFixed(0)}% vs global ${(globalSuccessRate * 100).toFixed(0)}%)`

    adjustments.push({
      agentId,
      taskType,
      currentWeight: DEFAULT_WEIGHT,
      suggestedWeight,
      reason,
      sampleSize: combo.records.length,
    })
  }

  return adjustments.sort((a, b) => Math.abs(b.suggestedWeight - b.currentWeight) - Math.abs(a.suggestedWeight - a.currentWeight))
}

/**
 * 获取指定 Agent 在指定任务类型下的路由权重
 *
 * 结合历史性能数据动态调整权重。
 */
export function getRoutingWeight(agentId: string, taskType: string): number {
  const adjustments = computeRoutingAdjustments()
  const adjustment = adjustments.find(
    (a) => a.agentId === agentId && a.taskType === taskType
  )
  return adjustment?.suggestedWeight ?? DEFAULT_WEIGHT
}

/**
 * 获取路由决策摘要（用于 Operator Console 展示）
 */
export function getRoutingSummary(): {
  totalDecisions: number
  agentStats: AgentPerformanceStats[]
  topAdjustments: RoutingWeightAdjustment[]
  recentTrend: 'improving' | 'stable' | 'declining'
} {
  const agentStats = analyzeAgentPerformance()
  const adjustments = computeRoutingAdjustments()

  // 计算最近趋势（最近 20 次 vs 之前 20 次）
  const recent20 = records.slice(-20)
  const prev20 = records.slice(-40, -20)

  const recentSuccessRate = recent20.length > 0
    ? recent20.filter((r) => r.executionStatus === 'completed').length / recent20.length
    : 0.5
  const prevSuccessRate = prev20.length > 0
    ? prev20.filter((r) => r.executionStatus === 'completed').length / prev20.length
    : 0.5

  let recentTrend: 'improving' | 'stable' | 'declining' = 'stable'
  if (recentSuccessRate > prevSuccessRate + 0.05) recentTrend = 'improving'
  else if (recentSuccessRate < prevSuccessRate - 0.05) recentTrend = 'declining'

  return {
    totalDecisions: records.length,
    agentStats,
    topAdjustments: adjustments.slice(0, 5),
    recentTrend,
  }
}
