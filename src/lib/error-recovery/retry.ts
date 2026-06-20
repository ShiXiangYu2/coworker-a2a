/**
 * Retry Mechanism — 自动重试机制
 *
 * 支持：
 *   - 指数退避
 *   - 线性退避
 *   - 固定间隔
 *   - 可重试错误类型过滤
 *   - 重试事件记录
 */

import type { RetryConfig, RetryResult } from './types'
import { classifyError } from './error-classifier'

// ─── 默认配置 ──────────────────────────────────────────────────────

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoff: 'exponential',
  retryableErrors: ['timeout', 'rate_limit', 'server_error', 'network'],
}

// ─── 核心重试函数 ──────────────────────────────────────────────────

/**
 * 带重试的函数执行
 *
 * @param fn 要执行的函数
 * @param config 重试配置
 * @param context 上下文信息（用于日志）
 * @returns 重试结果
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context: string = 'unknown',
): Promise<RetryResult<T>> {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  const startTime = Date.now()
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      const result = await fn()

      // 成功
      return {
        success: true,
        result,
        attempts: attempt + 1,
        totalDurationMs: Date.now() - startTime,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const classified = classifyError(lastError)

      // 检查是否可重试
      if (!classified.retryable || !mergedConfig.retryableErrors.includes(classified.category)) {
        console.log(`[Retry] ${context}: Non-retryable error (${classified.category}), stopping`)
        break
      }

      // 检查是否还有重试次数
      if (attempt >= mergedConfig.maxRetries) {
        console.log(`[Retry] ${context}: Max retries (${mergedConfig.maxRetries}) reached`)
        break
      }

      // 计算延迟
      const delay = calculateDelay(attempt, mergedConfig)
      console.log(`[Retry] ${context}: Attempt ${attempt + 1} failed (${classified.category}), retrying in ${delay}ms`)

      // 等待
      await sleep(delay)
    }
  }

  return {
    success: false,
    error: lastError?.message ?? 'Unknown error',
    attempts: mergedConfig.maxRetries + 1,
    totalDurationMs: Date.now() - startTime,
  }
}

/**
 * 计算重试延迟
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  switch (config.backoff) {
    case 'linear':
      return Math.min(config.baseDelayMs * (attempt + 1), config.maxDelayMs)

    case 'exponential':
      return Math.min(config.baseDelayMs * Math.pow(2, attempt), config.maxDelayMs)

    case 'fixed':
    default:
      return config.baseDelayMs
  }
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── 便捷函数 ──────────────────────────────────────────────────────

/**
 * 带指数退避的重试
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  context: string = 'unknown',
): Promise<RetryResult<T>> {
  return withRetry(fn, { maxRetries, backoff: 'exponential' }, context)
}

/**
 * 带固定间隔的重试
 */
export async function withFixedDelay<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  context: string = 'unknown',
): Promise<RetryResult<T>> {
  return withRetry(fn, { maxRetries, backoff: 'fixed', baseDelayMs: delayMs }, context)
}
