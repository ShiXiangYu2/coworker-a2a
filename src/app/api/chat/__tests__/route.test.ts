import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { POST } from '../route'

const testPrefix = `SSE regression ${Date.now()} ${Math.random().toString(36).slice(2)}`

async function cleanupTestConversations() {
  const runRecords = await prisma.runRequestRecord.findMany({
    where: { userMessage: { startsWith: testPrefix } },
    select: { correlationId: true },
  })
  const correlationIds = runRecords.map((record) => record.correlationId)
  if (correlationIds.length > 0) {
    await prisma.harmonyAuditEvent.deleteMany({
      where: { correlationId: { in: correlationIds } },
    })
    await prisma.runRequestRecord.deleteMany({
      where: { correlationId: { in: correlationIds } },
    })
  }
  await prisma.message.deleteMany({
    where: { conversation: { title: { startsWith: testPrefix } } },
  })
  await prisma.conversation.deleteMany({
    where: { title: { startsWith: testPrefix } },
  })
}

beforeEach(cleanupTestConversations)
afterEach(cleanupTestConversations)

describe('chat SSE regression', () => {
  it('returns a text/event-stream response', async () => {
    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `${testPrefix} hello` }),
      }) as never
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/event-stream')

    const text = await response.text()
    expect(text).toContain('"type":"start"')
    expect(text).toContain('"type":"done"')
    expect(text).toContain('"correlationId":"chathub-')
    expect(text).toContain('"runRequestRecordId":"')
  })

  it('returns 404 for missing conversation and records a failed request run', async () => {
    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: 'missing-conversation-id',
          message: `${testPrefix} missing conversation`,
        }),
      }) as never
    )

    expect(response.status).toBe(404)

    const runRecord = await prisma.runRequestRecord.findFirst({
      where: {
        source: 'chathub',
        userMessage: `${testPrefix} missing conversation`,
      },
      orderBy: { createdAt: 'desc' },
    })

    expect(runRecord).toBeTruthy()
    expect(runRecord?.status).toBe('failed')
  })
})
