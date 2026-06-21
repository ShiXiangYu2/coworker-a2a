import { generateTokenPair } from '@/lib/auth/jwt'

const tokens = await generateTokenPair('test-user', 'test-user', 'admin')
const authorization = `Bearer ${tokens.accessToken}`

export function authenticatedJsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify(body),
  })
}

export function authenticatedRequest(url: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers)
  headers.set('Authorization', authorization)
  return new Request(url, {
    ...init,
    headers,
  })
}
