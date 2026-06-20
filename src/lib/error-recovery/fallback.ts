/**
 * Fallback Mechanism — 降级策略
 *
 * 当主函数失败时，自动切换到降级函数。
 * 保证系统在部分故障时仍能提供服务。
 */

import type { FallbackConfig } from './types'
import { classifyError } from './error-classifier'

// ─── 核心降级函数 ──────────────────────────────────────────────────

/**
 * 带降级的函数执行
 *
 * @param config 降级配置
 * @returns 执行结果
 */
export async function withFallback<T>(config: FallbackConfig<T>): Promise<T> {
  try {
    return await config.primary()
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    const classified = classifyError(err)

    // 检查是否应该降级
    if (config.shouldFallback && !config.shouldFallback(err)) {
      throw err // 不降级，直接抛出
    }

    // 记录降级
    console.warn(`[Fallback] Primary failed (${classified.category}), switching to fallback`)
    config.onFallback?.(err)

    // 执行降级
    return config.fallback()
  }
}

// ─── 便捷函数 ──────────────────────────────────────────────────────

/**
 * 带默认值的降级
 */
export async function withDefaultValue<T>(
  fn: () => Promise<T>,
  defaultValue: T,
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.warn(`[Fallback] Failed, using default value:`, error)
    return defaultValue
  }
}

/**
 * 带缓存的降级
 */
const fallbackCache = new Map<string, { value: unknown; expiresAt: number }>()

export async function withCachedFallback<T>(
  key: string,
  fn: () => Promise<T>,
  cacheTtlMs: number = 60000, // 1 分钟
): Promise<T> {
  try {
    const result = await fn()
    // 缓存成功结果
    fallbackCache.set(key, { value: result, expiresAt: Date.now() + cacheTtlMs })
    return result
  } catch (error) {
    // 尝试从缓存获取
    const cached = fallbackCache.get(key)
    if (cached && Date.now() < cached.expiresAt) {
      console.warn(`[Fallback] Failed, using cached value for key: ${key}`)
      return cached.value as T
    }
    throw error
  }
}

/**
 * 带多级降级的函数执行
 */
export async function withMultiLevelFallback<T>(
  levels: Array<() => Promise<T>>,
  levelNames: string[] = [],
): Promise<T> {
  let lastError: Error | null = null

  for (let i = 0; i < levels.length; i++) {
    try {
      return await levels[i]()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const name = levelNames[i] ?? `Level ${i}`
      console.warn(`[Fallback] ${name} failed:`, lastError.message)
    }
  }

  throw lastError ?? new Error('All fallback levels failed')
}
