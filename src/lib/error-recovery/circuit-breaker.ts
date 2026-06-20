/**
 * Circuit Breaker — 熔断器
 *
 * 当服务连续失败时自动熔断，防止雪崩。
 * 恢复后自动半开测试。
 *
 * 状态：
 *   - closed：正常，允许请求
 *   - open：熔断，拒绝请求
 *   - half-open：半开，允许少量请求测试
 */

import type { CircuitBreakerConfig, CircuitBreakerState, CircuitState } from './types'

// ─── 默认配置 ──────────────────────────────────────────────────────

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  recoveryTimeoutMs: 30000, // 30 秒
  monitoringWindowMs: 60000, // 1 分钟
}

// ─── 熔断器实现 ────────────────────────────────────────────────────

export class CircuitBreaker {
  private state: CircuitState = 'closed'
  private failureCount = 0
  private successCount = 0
  private lastFailureTime?: Date
  private lastSuccessTime?: Date
  private openedAt?: Date
  private config: CircuitBreakerConfig
  private name: string

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 执行操作（带熔断保护）
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // 检查熔断状态
    if (this.state === 'open') {
      // 检查是否可以进入半开状态
      if (this.canTransitionToHalfOpen()) {
        this.state = 'half-open'
        this.successCount = 0
        console.log(`[CircuitBreaker:${this.name}] Transitioning to half-open`)
      } else {
        throw new Error(`Circuit breaker "${this.name}" is OPEN. Service unavailable.`)
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * 记录成功
   */
  private onSuccess(): void {
    this.lastSuccessTime = new Date()
    this.successCount++
    this.failureCount = 0 // 重置失败计数

    if (this.state === 'half-open') {
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'closed'
        this.openedAt = undefined
        console.log(`[CircuitBreaker:${this.name}] Recovered → closed`)
      }
    }
  }

  /**
   * 记录失败
   */
  private onFailure(): void {
    this.lastFailureTime = new Date()
    this.failureCount++
    this.successCount = 0

    if (this.state === 'half-open') {
      // 半开状态下失败，重新熔断
      this.state = 'open'
      this.openedAt = new Date()
      console.log(`[CircuitBreaker:${this.name}] Failed in half-open → open`)
    } else if (this.failureCount >= this.config.failureThreshold) {
      // 正常状态下达到阈值，熔断
      this.state = 'open'
      this.openedAt = new Date()
      console.log(`[CircuitBreaker:${this.name}] Failure threshold reached → open`)
    }
  }

  /**
   * 检查是否可以进入半开状态
   */
  private canTransitionToHalfOpen(): boolean {
    if (!this.openedAt) return false
    const elapsed = Date.now() - this.openedAt.getTime()
    return elapsed >= this.config.recoveryTimeoutMs
  }

  /**
   * 获取当前状态
   */
  getState(): CircuitBreakerState {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime?.toISOString(),
      lastSuccessTime: this.lastSuccessTime?.toISOString(),
      openedAt: this.openedAt?.toISOString(),
    }
  }

  /**
   * 手动重置
   */
  reset(): void {
    this.state = 'closed'
    this.failureCount = 0
    this.successCount = 0
    this.openedAt = undefined
    console.log(`[CircuitBreaker:${this.name}] Reset → closed`)
  }
}

// ─── 全局熔断器注册 ────────────────────────────────────────────────

const circuitBreakers = new Map<string, CircuitBreaker>()

/**
 * 获取或创建熔断器
 */
export function getCircuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>,
): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name, config))
  }
  return circuitBreakers.get(name)!
}

/**
 * 获取所有熔断器状态
 */
export function getAllCircuitBreakerStates(): Record<string, CircuitBreakerState> {
  const states: Record<string, CircuitBreakerState> = {}
  for (const [name, breaker] of circuitBreakers) {
    states[name] = breaker.getState()
  }
  return states
}

/**
 * 重置所有熔断器
 */
export function resetAllCircuitBreakers(): void {
  for (const breaker of circuitBreakers.values()) {
    breaker.reset()
  }
}
