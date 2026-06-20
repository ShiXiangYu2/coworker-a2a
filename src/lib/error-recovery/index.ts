/**
 * Error Recovery — 错误恢复模块
 *
 * 统一对外接口，集成重试、熔断、降级、回滚。
 *
 * 使用示例：
 *   import { withResilience } from '@/lib/error-recovery'
 *
 *   const result = await withResilience('llm-call', () => callLLM(), {
 *     retry: { maxRetries: 3, backoff: 'exponential' },
 *     circuitBreaker: { failureThreshold: 5 },
 *     fallback: () => getDefaultValue(),
 *   })
 */

import { withRetry, withExponentialBackoff, withFixedDelay } from './retry'
import { getCircuitBreaker, getAllCircuitBreakerStates, resetAllCircuitBreakers } from './circuit-breaker'
import { withFallback, withDefaultValue, withCachedFallback, withMultiLevelFallback } from './fallback'
import { createTransaction, addRollbackAction, executeTransaction, executeWithRollback, createFileRollback, createDbRollback } from './rollback'
import { classifyError, isRetryable, getErrorSeverity } from './error-classifier'
import type {
  RetryConfig,
  RetryResult,
  CircuitBreakerConfig,
  CircuitBreakerState,
  ClassifiedError,
  ErrorSeverity,
  RollbackAction,
  TransactionContext,
} from './types'

// ─── 统一恢复接口 ──────────────────────────────────────────────────

export interface ResilienceConfig {
  retry?: Partial<RetryConfig>
  circuitBreaker?: Partial<CircuitBreakerConfig>
  fallback?: () => Promise<unknown>
  enableCircuitBreaker?: boolean
}

/**
 * 带完整恢复能力的函数执行
 *
 * 集成：重试 + 熔断 + 降级
 */
export async function withResilience<T>(
  name: string,
  fn: () => Promise<T>,
  config: ResilienceConfig = {},
): Promise<T> {
  const circuitBreaker = config.enableCircuitBreaker !== false
    ? getCircuitBreaker(name, config.circuitBreaker)
    : null

  // 如果有降级函数，使用 withFallback
  if (config.fallback) {
    return withFallback({
      primary: async () => {
        if (circuitBreaker) {
          return circuitBreaker.execute(fn)
        }
        if (config.retry) {
          const result = await withRetry(fn, config.retry, name)
          if (!result.success) {
            throw new Error(result.error ?? 'Retry failed')
          }
          return result.result as T
        }
        return fn()
      },
      fallback: config.fallback as () => Promise<T>,
    })
  }

  // 无降级：重试 + 熔断
  if (circuitBreaker) {
    if (config.retry) {
      const result = await withRetry(
        () => circuitBreaker.execute(fn),
        config.retry,
        name,
      )
      if (!result.success) {
        throw new Error(result.error ?? 'Retry failed')
      }
      return result.result as T
    }
    return circuitBreaker.execute(fn)
  }

  // 仅重试
  if (config.retry) {
    const result = await withRetry(fn, config.retry, name)
    if (!result.success) {
      throw new Error(result.error ?? 'Retry failed')
    }
    return result.result as T
  }

  // 直接执行
  return fn()
}

// ─── 导出所有子模块 ────────────────────────────────────────────────

export {
  // 重试
  withRetry,
  withExponentialBackoff,
  withFixedDelay,

  // 熔断
  getCircuitBreaker,
  getAllCircuitBreakerStates,
  resetAllCircuitBreakers,

  // 降级
  withFallback,
  withDefaultValue,
  withCachedFallback,
  withMultiLevelFallback,

  // 回滚
  createTransaction,
  addRollbackAction,
  executeTransaction,
  executeWithRollback,
  createFileRollback,
  createDbRollback,

  // 错误分类
  classifyError,
  isRetryable,
  getErrorSeverity,
}

export type {
  RetryConfig,
  RetryResult,
  CircuitBreakerConfig,
  CircuitBreakerState,
  ClassifiedError,
  ErrorSeverity,
  RollbackAction,
  TransactionContext,
}
