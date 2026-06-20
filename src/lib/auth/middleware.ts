/**
 * Auth Middleware — 认证中间件
 *
 * 验证请求中的 JWT Token，注入用户信息。
 *
 * 使用方式：
 *   import { withAuth, requireRole } from '@/lib/auth/middleware'
 *
 *   export const GET = withAuth(async (request, user) => {
 *     return Response.json({ user })
 *   })
 */

import { verifyToken, extractToken } from './jwt'
import type { TokenPayload, UserRole, Permission } from './types'

// ─── 类型定义 ──────────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user: TokenPayload
}

type AuthHandler = (
  request: AuthenticatedRequest,
) => Promise<Response> | Response

// ─── 认证中间件 ────────────────────────────────────────────────────

/**
 * 包装 API 处理函数，添加认证
 */
export function withAuth(handler: AuthHandler): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const token = extractToken(request.headers.get('Authorization'))

    if (!token) {
      return Response.json(
        { ok: false, error: 'Missing authorization token' },
        { status: 401 },
      )
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return Response.json(
        { ok: false, error: 'Invalid or expired token' },
        { status: 401 },
      )
    }

    // 将用户信息注入到 request
    const authRequest = request as AuthenticatedRequest
    authRequest.user = payload

    return handler(authRequest)
  }
}

/**
 * 包装 API 处理函数，添加角色检查
 */
export function withRole(
  role: UserRole,
  handler: AuthHandler,
): (request: Request) => Promise<Response> {
  return withAuth(async (request) => {
    const authRequest = request as AuthenticatedRequest

    if (authRequest.user.role !== role && authRequest.user.role !== 'admin') {
      return Response.json(
        { ok: false, error: `Requires role: ${role}` },
        { status: 403 },
      )
    }

    return handler(authRequest)
  })
}

/**
 * 包装 API 处理函数，添加权限检查
 */
export function withPermission(
  permission: Permission,
  handler: AuthHandler,
): (request: Request) => Promise<Response> {
  return withAuth(async (request) => {
    const authRequest = request as AuthenticatedRequest
    const userPermissions = getPermissions(authRequest.user.role)

    if (!userPermissions.includes(permission)) {
      return Response.json(
        { ok: false, error: `Missing permission: ${permission}` },
        { status: 403 },
      )
    }

    return handler(authRequest)
  })
}

// ─── 辅助函数 ──────────────────────────────────────────────────────

function getPermissions(role: UserRole): Permission[] {
  const permissions: Record<UserRole, Permission[]> = {
    admin: [
      'task:create', 'task:read', 'task:update', 'task:delete',
      'agent:execute', 'agent:configure',
      'system:admin', 'system:monitor',
      'knowledge:read', 'knowledge:write',
    ],
    operator: [
      'task:create', 'task:read', 'task:update',
      'agent:execute',
      'system:monitor',
      'knowledge:read', 'knowledge:write',
    ],
    viewer: [
      'task:read',
      'system:monitor',
      'knowledge:read',
    ],
  }
  return permissions[role] ?? []
}

/**
 * 从请求中获取当前用户
 */
export function getCurrentUser(request: Request): TokenPayload | null {
  const token = extractToken(request.headers.get('Authorization'))
  if (!token) return null

  // 同步解析（不验证签名，仅用于获取用户信息）
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload as TokenPayload
  } catch {
    return null
  }
}
