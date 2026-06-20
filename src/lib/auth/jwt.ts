/**
 * JWT Utility — JSON Web Token 工具
 *
 * 简单的 JWT 实现，不依赖外部库。
 * 生产环境建议使用 jose 或 jsonwebtoken。
 */

import type { TokenPayload, TokenPair } from './types'

// ─── 配置 ──────────────────────────────────────────────────────────

const SECRET = process.env.JWT_SECRET ?? 'coworker-a2a-secret-key-change-in-production'
const ACCESS_TOKEN_EXPIRES = 24 * 60 * 60 // 24 小时
const REFRESH_TOKEN_EXPIRES = 7 * 24 * 60 * 60 // 7 天

// ─── 简单的 Base64 编码 ────────────────────────────────────────────

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
  return Buffer.from(base64, 'base64').toString()
}

// ─── HMAC 签名 ─────────────────────────────────────────────────────

async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))
}

async function hmacVerify(data: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  // 将 signature 从 base64url 转回
  let base64 = signature.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  const sigBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))

  return crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data))
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

  const accessToken = await generateToken({
    userId,
    username,
    role: role as 'admin' | 'operator' | 'viewer',
    iat: now,
    exp: now + ACCESS_TOKEN_EXPIRES,
  })

  const refreshToken = await generateToken({
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
async function generateToken(payload: TokenPayload): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64UrlEncode(JSON.stringify(payload))
  const signature = await hmacSign(`${header}.${body}`, SECRET)
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
    const valid = await hmacVerify(`${header}.${body}`, signature, SECRET)
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
