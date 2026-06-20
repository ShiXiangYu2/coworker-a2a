/**
 * Scheduler Types — 任务调度器类型定义
 */

// ─── Token 预算 ────────────────────────────────────────────────────

export interface TokenBudget {
  /** 每日 token 上限 */
  dailyLimit: number
  /** 每任务 token 上限 */
  perTaskLimit: number
  /** 每 Agent token 上限 */
  perAgentLimit: number
  /** 当前已使用（今日） */
  usedToday: number
  /** 当前任务已使用 */
  usedByTask: Record<string, number>
  /** 当前 Agent 已使用 */
  usedByAgent: Record<string, number>
  /** 重置时间 */
  resetAt: string
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  /** 估算成本（美元） */
  estimatedCostUsd: number
}

// ─── 任务优先级 ────────────────────────────────────────────────────

export type TaskPriority = 'critical' | 'high' | 'normal' | 'low'

export interface PrioritizedTask {
  id: string
  priority: TaskPriority
  /** 队列时间 */
  enqueuedAt: string
  /** Agent ID */
  agentId: string
  /** 任务描述 */
  description: string
  /** 预估 token 消耗 */
  estimatedTokens: number
  /** 依赖的任务 ID */
  dependsOn?: string[]
}

// ─── 限速器 ────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** 每分钟请求数 */
  requestsPerMinute: number
  /** �分钟 token 数 */
  tokensPerMinute: number
  /** 每秒请求数（突发限制） */
  requestsPerSecond: number
}

export interface RateLimitState {
  /** 当前分钟请求数 */
  minuteRequestCount: number
  /** 当前分钟 token 数 */
  minuteTokenCount: number
  /** 当前秒请求数 */
  secondRequestCount: number
  /** 窗口开始时间 */
  windowStart: string
  /** 是否被限速 */
  isLimited: boolean
  /** 限速结束时间 */
  limitedUntil?: string
}

// ─── 成本追踪 ──────────────────────────────────────────────────────

export interface CostRecord {
  id: string
  timestamp: string
  agentId: string
  taskId?: string
  /** LLM provider */
  provider: string
  /** 模型名称 */
  model: string
  /** token 使用量 */
  usage: TokenUsage
  /** 任务类型 */
  taskType?: string
}

export interface CostSummary {
  /** 今日总成本 */
  todayCostUsd: number
  /** 本周总成本 */
  weekCostUsd: number
  /** 本月总成本 */
  monthCostUsd: number
  /** 按 Agent 分组 */
  byAgent: Record<string, number>
  /** 按模型分组 */
  byModel: Record<string, number>
  /** 总请求数 */
  totalRequests: number
  /** 总 token 数 */
  totalTokens: number
}

// ─── 任务状态 ──────────────────────────────────────────────────────

export type TaskStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout'

export interface ScheduledTask {
  id: string
  status: TaskStatus
  priority: TaskPriority
  agentId: string
  description: string
  /** 入队时间 */
  enqueuedAt: string
  /** 开始时间 */
  startedAt?: string
  /** 完成时间 */
  completedAt?: string
  /** token 消耗 */
  tokenUsage?: TokenUsage
  /** 错误信息 */
  error?: string
  /** 超时毫秒 */
  timeoutMs: number
}
