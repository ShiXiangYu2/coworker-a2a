/**
 * Error Recovery Types — 错误恢复类型定义
 */

// ─── 重试 ──────────────────────────────────────────────────────────

export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number
  /** 基础延迟毫秒 */
  baseDelayMs: number
  /** 最大延迟毫秒 */
  maxDelayMs: number
  /** 退避策略 */
  backoff: 'linear' | 'exponential' | 'fixed'
  /** 可重试的错误类型 */
  retryableErrors: string[]
}

export interface RetryResult<T> {
  success: boolean
  result?: T
  error?: string
  attempts: number
  totalDurationMs: number
}

// ─── 熔断器 ────────────────────────────────────────────────────────

export type CircuitState = 'closed' | 'open' | 'half-open'

export interface CircuitBreakerConfig {
  /** 失败阈值（触发熔断） */
  failureThreshold: number
  /** 成功阈值（从半开恢复） */
  successThreshold: number
  /** 熔断恢复超时毫秒 */
  recoveryTimeoutMs: number
  /** 监控窗口毫秒 */
  monitoringWindowMs: number
}

export interface CircuitBreakerState {
  state: CircuitState
  failureCount: number
  successCount: number
  lastFailureTime?: string
  lastSuccessTime?: string
  openedAt?: string
}

// ─── 降级 ──────────────────────────────────────────────────────────

export interface FallbackConfig<T> {
  /** 主函数 */
  primary: () => Promise<T>
  /** 降级函数 */
  fallback: () => Promise<T>
  /** 降级条件 */
  shouldFallback?: (error: Error) => boolean
  /** 降级日志 */
  onFallback?: (error: Error) => void
}

// ─── 回滚 ──────────────────────────────────────────────────────────

export interface RollbackAction {
  id: string
  description: string
  execute: () => Promise<void>
}

export interface TransactionContext {
  actions: RollbackAction[]
  rolledBack: boolean
}

// ─── 错误分类 ──────────────────────────────────────────────────────

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ClassifiedError {
  originalError: Error
  severity: ErrorSeverity
  category: string
  retryable: boolean
  message: string
}
