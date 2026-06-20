/**
 * Me API — 获取当前用户信息
 *
 * GET /api/auth/me
 *
 * Headers: Authorization: Bearer <token>
 * Returns: { user }
 */

import { withAuth } from '@/lib/auth/middleware'

export const GET = withAuth(async (request) => {
  const user = request.user

  return Response.json({
    ok: true,
    data: {
      id: user.userId,
      username: user.username,
      role: user.role,
    },
  })
})
