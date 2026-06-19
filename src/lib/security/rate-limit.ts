// 速率限制模块

export interface RateLimitConfig {
  windowMs: number      // 时间窗口（毫秒）
  maxRequests: number   // 最大请求数
  message?: string      // 超限消息
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private config: RateLimitConfig

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      windowMs: 60 * 1000, // 1 分钟
      maxRequests: 30,
      message: 'Too many requests, please try again later.',
      ...config,
    }
  }

  /**
   * 检查是否允许请求
   */
  check(key: string): RateLimitResult {
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    // 获取该 key 的请求历史
    let timestamps = this.requests.get(key) || []

    // 过滤掉窗口外的请求
    timestamps = timestamps.filter(t => t > windowStart)

    // 检查是否超过限制
    if (timestamps.length >= this.config.maxRequests) {
      const oldestTimestamp = timestamps[0]
      const resetAt = new Date(oldestTimestamp + this.config.windowMs)
      const retryAfter = Math.ceil((resetAt.getTime() - now) / 1000)

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter,
      }
    }

    // 允许请求，记录时间戳
    timestamps.push(now)
    this.requests.set(key, timestamps)

    return {
      allowed: true,
      remaining: this.config.maxRequests - timestamps.length,
      resetAt: new Date(now + this.config.windowMs),
    }
  }

  /**
   * 获取客户端标识
   */
  static getClientKey(request: Request): string {
    // 优先使用 X-Forwarded-For 头部
    const forwardedFor = request.headers.get('X-Forwarded-For')
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim()
    }

    // 使用 X-Real-IP 头部
    const realIp = request.headers.get('X-Real-IP')
    if (realIp) {
      return realIp
    }

    // 使用连接 IP（Next.js 无法直接获取，使用默认值）
    return 'unknown'
  }

  /**
   * 清理过期记录
   */
  cleanup(): void {
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(t => t > windowStart)
      if (validTimestamps.length === 0) {
        this.requests.delete(key)
      } else {
        this.requests.set(key, validTimestamps)
      }
    }
  }
}

// 预定义的速率限制配置
export const RATE_LIMIT_CONFIGS = {
  // 通用 API
  general: {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 60,
  },
  // 聊天 API（消耗 LLM 资源）
  chat: {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 10,
    message: 'Chat rate limit exceeded. Please wait before sending another message.',
  },
  // 写入操作
  write: {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 30,
  },
  // 严格限制
  strict: {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 5,
  },
}

// 单例实例
const rateLimiters: Map<string, RateLimiter> = new Map()

export function getRateLimiter(configName: string = 'general'): RateLimiter {
  if (!rateLimiters.has(configName)) {
    const config = RATE_LIMIT_CONFIGS[configName as keyof typeof RATE_LIMIT_CONFIGS]
    rateLimiters.set(configName, new RateLimiter(config))
  }
  return rateLimiters.get(configName)!
}

/**
 * 速率限制中间件
 */
export function withRateLimit(
  configName: string = 'general'
): (handler: (request: Request, context?: unknown) => Promise<Response>) =>
  (request: Request, context?: unknown) => Promise<Response> {
  return (handler) => async (request: Request, context?: unknown) => {
    const rateLimiter = getRateLimiter(configName)
    const clientKey = RateLimiter.getClientKey(request)

    const result = rateLimiter.check(clientKey)

    if (!result.allowed) {
      return Response.json(
        {
          ok: false,
          error: {
            message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimiter['config'].maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetAt.toISOString(),
            'Retry-After': String(result.retryAfter),
          },
        }
      )
    }

    const response = await handler(request, context)

    // 添加速率限制头
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })

    newResponse.headers.set('X-RateLimit-Limit', String(rateLimiter['config'].maxRequests))
    newResponse.headers.set('X-RateLimit-Remaining', String(result.remaining))
    newResponse.headers.set('X-RateLimit-Reset', result.resetAt.toISOString())

    return newResponse
  }
}
