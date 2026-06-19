// API 认证模块

import { randomUUID } from 'node:crypto'

export interface AuthToken {
  id: string
  token: string
  userId: string
  createdAt: Date
  expiresAt: Date
}

export class AuthManager {
  private tokens: Map<string, AuthToken> = new Map()
  private localToken: string

  constructor() {
    // 生成本地 token
    this.localToken = process.env.LOCAL_AUTH_TOKEN || randomUUID()
    console.log(`[Auth] Local token: ${this.localToken}`)
  }

  /**
   * 验证 token
   */
  verify(token: string): boolean {
    // 检查本地 token
    if (token === this.localToken) {
      return true
    }

    // 检查已注册的 token
    const authToken = this.tokens.get(token)
    if (!authToken) {
      return false
    }

    // 检查过期时间
    if (authToken.expiresAt < new Date()) {
      this.tokens.delete(token)
      return false
    }

    return true
  }

  /**
   * 从请求中提取 token
   */
  extractToken(request: Request): string | null {
    // 从 Authorization 头部提取
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7)
    }

    // 从查询参数提取
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    if (token) {
      return token
    }

    return null
  }

  /**
   * 检查请求是否已认证
   */
  isAuthenticated(request: Request): boolean {
    const token = this.extractToken(request)
    if (!token) {
      return false
    }
    return this.verify(token)
  }

  /**
   * 创建新 token
   */
  createToken(userId: string, expiresInSeconds: number = 86400): AuthToken {
    const token: AuthToken = {
      id: randomUUID(),
      token: randomUUID(),
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    }

    this.tokens.set(token.token, token)
    return token
  }

  /**
   * 撤销 token
   */
  revokeToken(token: string): boolean {
    return this.tokens.delete(token)
  }

  /**
   * 获取本地 token
   */
  getLocalToken(): string {
    return this.localToken
  }
}

// 单例实例
let authManager: AuthManager | null = null

export function getAuthManager(): AuthManager {
  if (!authManager) {
    authManager = new AuthManager()
  }
  return authManager
}

/**
 * 认证中间件
 */
export function withAuth(
  handler: (request: Request, context?: unknown) => Promise<Response>
): (request: Request, context?: unknown) => Promise<Response> {
  return async (request: Request, context?: unknown) => {
    const authManager = getAuthManager()

    // 跳过 OPTIONS 请求（CORS 预检）
    if (request.method === 'OPTIONS') {
      return handler(request, context)
    }

    // 检查认证
    if (!authManager.isAuthenticated(request)) {
      return Response.json(
        { ok: false, error: { message: 'Unauthorized. Please provide a valid token.' } },
        { status: 401 }
      )
    }

    return handler(request, context)
  }
}
