import { afterEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { POST } from '../route'

afterEach(async () => {
  await prisma.message.deleteMany({
    where: { conversation: { title: { startsWith: 'SSE regression' } } },
  })
  await prisma.conversation.deleteMany({
    where: { title: { startsWith: 'SSE regression' } },
  })
})

describe('chat SSE regression', () => {
  it('returns a text/event-stream response', async () => {
    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'SSE regression hello' }),
      }) as never
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/event-stream')

    const text = await response.text()
    expect(text).toContain('"type":"start"')
    expect(text).toContain('"type":"done"')
  })
})
