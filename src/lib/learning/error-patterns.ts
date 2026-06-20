/**
 * Error Pattern Learner — 错误模式学习器
 *
 * 从 Agent 执行失败中学习，识别错误模式，避免重复犯错。
 *
 * 核心流程：
 *   1. 收集失败记录
 *   2. 分类错误类型（超时/权限/格式/逻辑/外部依赖）
 *   3. 识别重复模式
 *   4. 生成避免建议
 *   5. 暴露给路由器和 Agent 使用
 *
 * 安全：
 *   - 只记录错误模式，不存储原始错误内容
 *   - 建议仅供参考，不强制执行
 */

import type { AgentId } from '@/lib/agents/types'

// ─── 类型定义 ──────────────────────────────────────────────────────

export type ErrorCategory =
  | 'timeout'
  | 'permission'
  | 'format'
  | 'logic'
  | 'external_dependency'
  | 'resource_exhaustion'
  | 'unknown'

export interface ErrorPattern {
  id: string
  category: ErrorCategory
  /** 错误摘要 */
  summary: string
  /** 出现次数 */
  count: number
  /** 涉及的 Agent */
  agentIds: AgentId[]
  /** 涉及的任务类型 */
  taskTypes: string[]
  /** 首次出现 */
  firstSeen: string
  /** 最近出现 */
  lastSeen: string
  /** 避免建议 */
  avoidanceAdvice: string
}

export interface ErrorRecord {
  timestamp: string
  agentId: AgentId
  taskType: string
  errorMessage: string
  /** 错误分类 */
  category: ErrorCategory
  /** 是否可重试 */
  retryable: boolean
}

// ─── 存储 ──────────────────────────────────────────────────────────

const MAX_RECORDS = 500
const errorRecords: ErrorRecord[] = []
const patterns = new Map<string, ErrorPattern>()
let patternIdCounter = 0

// ─── 错误分类 ──────────────────────────────────────────────────────

const ERROR_PATTERNS: Array<{ pattern: RegExp; category: ErrorCategory }> = [
  // 超时
  { pattern: /timeout|timed out|deadline exceeded/i, category: 'timeout' },
  { pattern: /ETIMEDOUT|ESOCKETTIMEDOUT/i, category: 'timeout' },

  // 权限
  { pattern: /permission|denied|forbidden|unauthorized|403|401/i, category: 'permission' },
  { pattern: /not allowed|blocked|rejected/i, category: 'permission' },

  // 格式
  { pattern: /parse|syntax|invalid|malformed|unexpected token/i, category: 'format' },
  { pattern: /JSON|schema|validation/i, category: 'format' },

  // 逻辑
  { pattern: /assertion|expected|actual|mismatch|incorrect/i, category: 'logic' },
  { pattern: /test.*fail|spec.*fail/i, category: 'logic' },

  // 外部依赖
  { pattern: /ECONNREFUSED|ENOTFOUND|fetch|network/i, category: 'external_dependency' },
  { pattern: /API.*error|rate.*limit|503|502/i, category: 'external_dependency' },

  // 资源耗尽
  { pattern: /OOM|out of memory|heap|allocation/i, category: 'resource_exhaustion' },
  { pattern: /ENOSPC|disk full|quota/i, category: 'resource_exhaustion' },
]

function classifyError(errorMessage: string): ErrorCategory {
  for (const { pattern, category } of ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return category
    }
  }
  return 'unknown'
}

// ─── 记录错误 ──────────────────────────────────────────────────────

/**
 * 记录一次错误
 */
export function recordError(
  agentId: AgentId,
  taskType: string,
  errorMessage: string,
  retryable: boolean = false,
): void {
  const category = classifyError(errorMessage)

  const record: ErrorRecord = {
    timestamp: new Date().toISOString(),
    agentId,
    taskType,
    errorMessage: errorMessage.slice(0, 500),
    category,
    retryable,
  }

  errorRecords.push(record)

  // 滑动窗口
  if (errorRecords.length > MAX_RECORDS) {
    errorRecords.shift()
  }

  // 更新模式
  updatePatterns(record)
}

// ─── 模式识别 ──────────────────────────────────────────────────────

function updatePatterns(record: ErrorRecord): void {
  // 生成模式 key（category + agentId + taskType）
  const key = `${record.category}:${record.agentId}:${record.taskType}`

  const existing = patterns.get(key)
  if (existing) {
    existing.count++
    existing.lastSeen = record.timestamp
    if (!existing.agentIds.includes(record.agentId)) {
      existing.agentIds.push(record.agentId)
    }
    if (!existing.taskTypes.includes(record.taskType)) {
      existing.taskTypes.push(record.taskType)
    }
  } else {
    patterns.set(key, {
      id: `ep-${++patternIdCounter}`,
      category: record.category,
      summary: generatePatternSummary(record),
      count: 1,
      agentIds: [record.agentId],
      taskTypes: [record.taskType],
      firstSeen: record.timestamp,
      lastSeen: record.timestamp,
      avoidanceAdvice: generateAvoidanceAdvice(record.category),
    })
  }
}

function generatePatternSummary(record: ErrorRecord): string {
  const categoryLabels: Record<ErrorCategory, string> = {
    timeout: 'Timeout errors',
    permission: 'Permission denied',
    format: 'Format/parse errors',
    logic: 'Logic/test failures',
    external_dependency: 'External dependency failures',
    resource_exhaustion: 'Resource exhaustion',
    unknown: 'Unclassified errors',
  }
  return `${categoryLabels[record.category]} in ${record.agentId} (${record.taskType})`
}

function generateAvoidanceAdvice(category: ErrorCategory): string {
  const advice: Record<ErrorCategory, string> = {
    timeout: 'Consider breaking the task into smaller steps or increasing timeout limits.',
    permission: 'Check permission requirements before executing. Use lower-privilege operations.',
    format: 'Validate input/output formats before processing. Use schema validation.',
    logic: 'Verify assumptions with tests. Break complex logic into smaller verifiable units.',
    external_dependency: 'Add retry logic with exponential backoff. Implement circuit breaker pattern.',
    resource_exhaustion: 'Monitor resource usage. Implement cleanup and garbage collection.',
    unknown: 'Investigate the root cause. Add more specific error handling.',
  }
  return advice[category]
}

// ─── 查询 ──────────────────────────────────────────────────────────

/**
 * 获取所有错误模式
 */
export function getErrorPatterns(): ErrorPattern[] {
  return Array.from(patterns.values()).sort((a, b) => b.count - a.count)
}

/**
 * 获取指定 Agent 的错误模式
 */
export function getErrorPatternsForAgent(agentId: AgentId): ErrorPattern[] {
  return getErrorPatterns().filter((p) => p.agentIds.includes(agentId))
}

/**
 * 获取指定任务类型的错误模式
 */
export function getErrorPatternsForTaskType(taskType: string): ErrorPattern[] {
  return getErrorPatterns().filter((p) => p.taskTypes.includes(taskType))
}

/**
 * 检查是否存在已知的错误模式
 *
 * @returns 如果存在已知错误模式，返回避免建议；否则返回 null
 */
export function checkKnownErrorPattern(
  agentId: AgentId,
  taskType: string,
  errorMessage: string,
): { pattern: ErrorPattern; advice: string } | null {
  const category = classifyError(errorMessage)
  const key = `${category}:${agentId}:${taskType}`

  const pattern = patterns.get(key)
  if (pattern && pattern.count >= 3) {
    return {
      pattern,
      advice: pattern.avoidanceAdvice,
    }
  }

  return null
}

/**
 * 获取错误统计摘要
 */
export function getErrorSummary(): {
  totalErrors: number
  byCategory: Record<ErrorCategory, number>
  byAgent: Record<string, number>
  topPatterns: ErrorPattern[]
  retryableRate: number
} {
  const byCategory: Record<ErrorCategory, number> = {
    timeout: 0, permission: 0, format: 0, logic: 0,
    external_dependency: 0, resource_exhaustion: 0, unknown: 0,
  }
  const byAgent: Record<string, number> = {}
  let retryableCount = 0

  for (const record of errorRecords) {
    byCategory[record.category]++
    byAgent[record.agentId] = (byAgent[record.agentId] ?? 0) + 1
    if (record.retryable) retryableCount++
  }

  return {
    totalErrors: errorRecords.length,
    byCategory,
    byAgent,
    topPatterns: getErrorPatterns().slice(0, 5),
    retryableRate: errorRecords.length > 0 ? retryableCount / errorRecords.length : 0,
  }
}

/**
 * 清空错误记录（仅测试用）
 */
export function clearErrorRecords(): void {
  errorRecords.length = 0
  patterns.clear()
}
