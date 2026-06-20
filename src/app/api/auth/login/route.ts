/**
 * Login API — 登录接口
 *
 * POST /api/auth/login
 *
 * Body: { username: string, password: string }
 * Returns: { token, user }
 */

import { generateTokenPair } from '@/lib/auth/jwt'

// 简单的用户存储（生产环境应该用数据库）
const USERS = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123', // 生产环境应该用 bcrypt 哈希
    email: 'admin@coworker.ai',
    role: 'admin' as const,
  },
  {
    id: '2',
    username: 'operator',
    password: 'operator123',
    email: 'operator@coworker.ai',
    role: 'operator' as const,
  },
  {
    id: '3',
    username: 'viewer',
    password: 'viewer123',
    email: 'viewer@coworker.ai',
    role: 'viewer' as const,
  },
]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return Response.json(
        { ok: false, error: 'Username and password are required' },
        { status: 400 },
      )
    }

    // 查找用户
    const user = USERS.find(
      (u) => u.username === username && u.password === password,
    )

    if (!user) {
      return Response.json(
        { ok: false, error: 'Invalid credentials' },
        { status: 401 },
      )
    }

    // 生成 Token
    const tokens = await generateTokenPair(user.id, user.username, user.role)

    return Response.json({
      ok: true,
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
