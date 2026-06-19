/**
 * Chat API 多 Agent 协作流程测试
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { POST } from '../route'

const testPrefix = `multi-agent-test-${Date.now()}-${Math.random().toString(36).slice(2)}`

async function cleanupTestConversations() {
  await prisma.message.deleteMany({
    where: { conversation: { title: { startsWith: testPrefix } } },
  })
  await prisma.conversation.deleteMany({
    where: { title: { startsWith: testPrefix } },
  })
}

beforeEach(cleanupTestConversations)
afterEach(cleanupTestConversations)

describe('Chat API - Multi-Agent Flow', () => {
  it('should return SSE response with route event', async () => {
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
    // Should have either route or decomposition event
    const hasRoute = text.includes('"type":"route"')
    const hasDecomposition = text.includes('"type":"decomposition"')
    expect(hasRoute || hasDecomposition).toBe(true)
  })

  it('should handle empty message', async () => {
    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '' }),
      }) as never
    )

    expect(response.status).toBe(400)
  })

  it('should create conversation and store messages', async () => {
    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `${testPrefix} store messages` }),
      }) as never
    )

    expect(response.status).toBe(200)

    // Read the stream to completion
    const text = await response.text()
    expect(text).toContain('"type":"done"')

    // Extract conversationId from the start event
    const startMatch = text.match(/"conversationId":"([^"]+)"/)
    if (startMatch) {
      const convId = startMatch[1]
      const messages = await prisma.message.findMany({
        where: { conversationId: convId },
      })
      // Should have at least user message + assistant message
      expect(messages.length).toBeGreaterThanOrEqual(2)
    }
  })
})
