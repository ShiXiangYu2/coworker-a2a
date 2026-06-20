/**
 * JWT Utility — JSON Web Token 工具
 *
 * 使用 Node.js 内置 crypto 模块实现 JWT。
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import type { TokenPayload, TokenPair } from './types'

// ─── 配置 ──────────────────────────────────────────────────────────

const SECRET = process.env.JWT_SECRET ?? 'coworker-a2a-secret-key-change-in-production'
const ACCESS_TOKEN_EXPIRES = 24 * 60 * 60 // 24 小时
const REFRESH_TOKEN_EXPIRES = 7 * 24 * 60 * 60 // 7 天

// ─── Base64url 编码 ────────────────────────────────────────────────

function base64UrlEncode(data: string): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64UrlDecode(data: string): string {
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  return Buffer.from(base64, 'base64').toString('utf-8')
}

// ─── HMAC 签名 ─────────────────────────────────────────────────────

function hmacSign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url')
}

function hmacVerify(data: string, signature: string, secret: string): boolean {
  const expected = hmacSign(data, secret)
  const sigBuffer = Buffer.from(signature, 'base64url')
  const expectedBuffer = Buffer.from(expected, 'base64url')

  if (sigBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(sigBuffer, expectedBuffer)
}

// ─── Token 生成 ────────────────────────────────────────────────────

/**
 * 生成 Token 对
 */
export async function generateTokenPair(
  userId: string,
  username: string,
  role: string,
): Promise<TokenPair> {
  const now = Math.floor(Date.now() / 1000)

  const accessToken = generateToken({
    userId,
    username,
    role: role as 'admin' | 'operator' | 'viewer',
    iat: now,
    exp: now + ACCESS_TOKEN_EXPIRES,
  })

  const refreshToken = generateToken({
    userId,
    username,
    role: role as 'admin' | 'operator' | 'viewer',
    iat: now,
    exp: now + REFRESH_TOKEN_EXPIRES,
  })

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRES,
  }
}

/**
 * 生成单个 Token
 */
function generateToken(payload: TokenPayload): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64UrlEncode(JSON.stringify(payload))
  const signature = hmacSign(`${header}.${body}`, SECRET)
  return `${header}.${body}.${signature}`
}

// ─── Token 验证 ────────────────────────────────────────────────────

/**
 * 验证 Token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [header, body, signature] = parts

    // 验证签名
    const valid = hmacVerify(`${header}.${body}`, signature, SECRET)
    if (!valid) return null

    // 解析 payload
    const payload = JSON.parse(base64UrlDecode(body)) as TokenPayload

    // 检查过期
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null

    return payload
  } catch {
    return null
  }
}

/**
 * 从 Authorization header 提取 Token
 */
export function extractToken(authorization: string | null): string | null {
  if (!authorization) return null
  const parts = authorization.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  return parts[1]
}
