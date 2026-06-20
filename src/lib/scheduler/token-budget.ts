/**
 * Token Budget Manager — Token 预算管理器
 *
 * 跟踪和限制 LLM token 消耗：
 *   - 每日 token 上限
 *   - 每任务 token 上限
 *   - 每 Agent token 上限
 *   - 成本估算和追踪
 *
 * 安全：
 *   - 超过预算时拒绝 LLM 调用
 *   - 滑动窗口统计
 *   - 预算超限发出警告
 */

import type { TokenBudget, TokenUsage, CostRecord, CostSummary } from './types'

// ─── 配置 ──────────────────────────────────────────────────────────

const DEFAULT_DAILY_LIMIT = 1_000_000 // 1M tokens/day
const DEFAULT_PER_TASK_LIMIT = 100_000 // 100K tokens/task
const DEFAULT_PER_AGENT_LIMIT = 500_000 // 500K tokens/agent/day

/** 模型定价（每 1K token，美元） */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
  'claude-haiku-4-20250414': { input: 0.00025, output: 0.00125 },
  'claude-opus-4-20250514': { input: 0.015, output: 0.075 },
  'deepseek-v4-pro': { input: 0.001, output: 0.002 },
  'step-3.7-flash': { input: 0.0005, output: 0.001 },
  'mock': { input: 0, output: 0 },
}

const DEFAULT_PRICING = { input: 0.003, output: 0.015 }

// ─── 状态 ──────────────────────────────────────────────────────────

const budget: TokenBudget = {
  dailyLimit: DEFAULT_DAILY_LIMIT,
  perTaskLimit: DEFAULT_PER_TASK_LIMIT,
  perAgentLimit: DEFAULT_PER_AGENT_LIMIT,
  usedToday: 0,
  usedByTask: {},
  usedByAgent: {},
  resetAt: getTomorrowMidnight(),
}

const costRecords: CostRecord[] = []
const MAX_COST_RECORDS = 1000

// ─── 预算检查 ──────────────────────────────────────────────────────

/**
 * 检查是否超出预算
 *
 * @returns null 表示可以执行，否则返回拒绝原因
 */
export function checkBudget(
  agentId: string,
  taskId?: string,
  estimatedTokens?: number,
): string | null {
  // 检查每日重置
  maybeResetDaily()

  const estimate = estimatedTokens ?? 5000 // 默认估算 5K tokens

  // 检查每日上限
  if (budget.usedToday + estimate > budget.dailyLimit) {
    return `Daily token limit exceeded: ${budget.usedToday}/${budget.dailyLimit} (estimated +${estimate})`
  }

  // 检查 Agent 上限
  const agentUsed = budget.usedByAgent[agentId] ?? 0
  if (agentUsed + estimate > budget.perAgentLimit) {
    return `Agent token limit exceeded for ${agentId}: ${agentUsed}/${budget.perAgentLimit}`
  }

  // 检查任务上限
  if (taskId) {
    const taskUsed = budget.usedByTask[taskId] ?? 0
    if (taskUsed + estimate > budget.perTaskLimit) {
      return `Task token limit exceeded for ${taskId}: ${taskUsed}/${budget.perTaskLimit}`
    }
  }

  return null // 可以执行
}

/**
 * 记录 token 使用量
 */
export function recordTokenUsage(
  agentId: string,
  usage: TokenUsage,
  options: {
    taskId?: string
    provider?: string
    model?: string
    taskType?: string
  } = {},
): void {
  // 检查每日重置
  maybeResetDaily()

  // 更新预算
  budget.usedToday += usage.totalTokens
  budget.usedByAgent[agentId] = (budget.usedByAgent[agentId] ?? 0) + usage.totalTokens
  if (options.taskId) {
    budget.usedByTask[options.taskId] = (budget.usedByTask[options.taskId] ?? 0) + usage.totalTokens
  }

  // 记录成本
  const provider = options.provider ?? 'unknown'
  const model = options.model ?? 'unknown'
  const costUsd = estimateCost(usage, model)

  const record: CostRecord = {
    id: `cost-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    agentId,
    taskId: options.taskId,
    provider,
    model,
    usage: { ...usage, estimatedCostUsd: costUsd },
    taskType: options.taskType,
  }

  costRecords.push(record)
  if (costRecords.length > MAX_COST_RECORDS) {
    costRecords.shift()
  }

  // 日志警告
  if (budget.usedToday > budget.dailyLimit * 0.8) {
    console.warn(
      `[TokenBudget] Warning: ${(budget.usedToday / budget.dailyLimit * 100).toFixed(1)}% of daily limit used`
    )
  }
}

/**
 * 获取当前预算状态
 */
export function getBudget(): TokenBudget {
  maybeResetDaily()
  return { ...budget }
}

/**
 * 获取成本摘要
 */
export function getCostSummary(): CostSummary {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const weekStart = todayStart - (now.getDay() * 24 * 60 * 60 * 1000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

  let todayCost = 0
  let weekCost = 0
  let monthCost = 0
  let totalRequests = 0
  let totalTokens = 0
  const byAgent: Record<string, number> = {}
  const byModel: Record<string, number> = {}

  for (const record of costRecords) {
    const recordTime = new Date(record.timestamp).getTime()
    const cost = record.usage.estimatedCostUsd

    if (recordTime >= todayStart) {
      todayCost += cost
    }
    if (recordTime >= weekStart) {
      weekCost += cost
    }
    if (recordTime >= monthStart) {
      monthCost += cost
    }

    totalRequests++
    totalTokens += record.usage.totalTokens

    byAgent[record.agentId] = (byAgent[record.agentId] ?? 0) + cost
    byModel[record.model] = (byModel[record.model] ?? 0) + cost
  }

  return {
    todayCostUsd: round4(todayCost),
    weekCostUsd: round4(weekCost),
    monthCostUsd: round4(monthCost),
    byAgent: Object.fromEntries(Object.entries(byAgent).map(([k, v]) => [k, round4(v)])),
    byModel: Object.fromEntries(Object.entries(byModel).map(([k, v]) => [k, round4(v)])),
    totalRequests,
    totalTokens,
  }
}

// ─── 辅助函数 ──────────────────────────────────────────────────────

function estimateCost(usage: TokenUsage, model: string): number {
  const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING
  const inputCost = (usage.inputTokens / 1000) * pricing.input
  const outputCost = (usage.outputTokens / 1000) * pricing.output
  return inputCost + outputCost
}

function getTomorrowMidnight(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow.toISOString()
}

function maybeResetDaily(): void {
  const now = new Date()
  const resetTime = new Date(budget.resetAt)
  if (now >= resetTime) {
    // 重置
    budget.usedToday = 0
    budget.usedByAgent = {}
    budget.usedByTask = {}
    budget.resetAt = getTomorrowMidnight()
    console.log('[TokenBudget] Daily budget reset')
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}
