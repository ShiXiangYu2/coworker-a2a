/**
 * Rate Limiter — API 限速器
 *
 * 防止 LLM API 被限速，支持：
 *   - 每分钟请求数限制
 *   - 每分钟 token 数限制
 *   - 每秒突发请求限制
 *   - 自动等待和重试
 *
 * 算法：滑动窗口 + 令牌桶
 */

import type { RateLimitConfig, RateLimitState } from './types'

// ─── 默认配置 ──────────────────────────────────────────────────────

const DEFAULT_CONFIG: RateLimitConfig = {
  requestsPerMinute: 60,
  tokensPerMinute: 100_000,
  requestsPerSecond: 5,
}

// ─── 状态 ──────────────────────────────────────────────────────────

const state: RateLimitState = {
  minuteRequestCount: 0,
  minuteTokenCount: 0,
  secondRequestCount: 0,
  windowStart: new Date().toISOString(),
  isLimited: false,
}

let minuteWindowStart = Date.now()
let secondWindowStart = Date.now()
let config = { ...DEFAULT_CONFIG }

// ─── 配置 ──────────────────────────────────────────────────────────

/**
 * 更新限速配置
 */
export function configureRateLimit(newConfig: Partial<RateLimitConfig>): void {
  config = { ...config, ...newConfig }
}

/**
 * 获取当前配置
 */
export function getRateLimitConfig(): RateLimitConfig {
  return { ...config }
}

// ─── 限速检查 ──────────────────────────────────────────────────────

/**
 * 检查是否可以发送请求
 *
 * @param estimatedTokens 预估 token 数
 * @returns null 表示可以发送，否则返回等待毫秒数
 */
export function checkRateLimit(estimatedTokens: number = 0): number | null {
  const now = Date.now()

  // 重置分钟窗口
  if (now - minuteWindowStart >= 60_000) {
    state.minuteRequestCount = 0
    state.minuteTokenCount = 0
    minuteWindowStart = now
    state.isLimited = false
    state.limitedUntil = undefined
  }

  // 重置秒窗口
  if (now - secondWindowStart >= 1_000) {
    state.secondRequestCount = 0
    secondWindowStart = now
  }

  // 检查是否被限速
  if (state.isLimited && state.limitedUntil) {
    const limitedUntil = new Date(state.limitedUntil).getTime()
    if (now < limitedUntil) {
      return limitedUntil - now // 需要等待的毫秒数
    }
    state.isLimited = false
    state.limitedUntil = undefined
  }

  // 检查每秒突发限制
  if (state.secondRequestCount >= config.requestsPerSecond) {
    const waitMs = 1_000 - (now - secondWindowStart)
    if (waitMs > 0) return waitMs
  }

  // 检查每分钟请求数
  if (state.minuteRequestCount >= config.requestsPerMinute) {
    const waitMs = 60_000 - (now - minuteWindowStart)
    state.isLimited = true
    state.limitedUntil = new Date(now + waitMs).toISOString()
    return waitMs
  }

  // 检查每分钟 token 数
  if (state.minuteTokenCount + estimatedTokens > config.tokensPerMinute) {
    const waitMs = 60_000 - (now - minuteWindowStart)
    state.isLimited = true
    state.limitedUntil = new Date(now + waitMs).toISOString()
    return waitMs
  }

  return null // 可以发送
}

/**
 * 记录一次请求
 */
export function recordRequest(tokens: number): void {
  state.minuteRequestCount++
  state.secondRequestCount++
  state.minuteTokenCount += tokens
}

/**
 * 获取当前限速状态
 */
export function getRateLimitState(): RateLimitState {
  return { ...state }
}

/**
 * 等待直到可以发送请求
 *
 * @param estimatedTokens 预估 token 数
 * @param maxWaitMs 最大等待时间（默认 30s）
 * @returns 是否可以发送（false 表示超时）
 */
export async function waitForRateLimit(
  estimatedTokens: number = 0,
  maxWaitMs: number = 30_000,
): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    const waitMs = checkRateLimit(estimatedTokens)
    if (waitMs === null) return true // 可以发送

    // 等待，但不超过最大等待时间
    const actualWait = Math.min(waitMs, maxWaitMs - (Date.now() - startTime))
    if (actualWait <= 0) break

    await new Promise((resolve) => setTimeout(resolve, actualWait))
  }

  return false // 超时
}
