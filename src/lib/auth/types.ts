/**
 * Auth Types — 认证类型定义
 */

// ─── 用户 ──────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'operator' | 'viewer'

export interface User {
  id: string
  username: string
  email: string
  role: UserRole
  createdAt: string
}

// ─── Token ─────────────────────────────────────────────────────────

export interface TokenPayload {
  userId: string
  username: string
  role: UserRole
  iat: number
  exp: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

// ─── 认证结果 ──────────────────────────────────────────────────────

export interface AuthResult {
  success: boolean
  user?: User
  token?: TokenPair
  error?: string
}

// ─── 权限 ──────────────────────────────────────────────────────────

export type Permission =
  | 'task:create'
  | 'task:read'
  | 'task:update'
  | 'task:delete'
  | 'agent:execute'
  | 'agent:configure'
  | 'system:admin'
  | 'system:monitor'
  | 'knowledge:read'
  | 'knowledge:write'

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
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
