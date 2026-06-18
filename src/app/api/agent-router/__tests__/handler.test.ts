import { describe, expect, it } from 'vitest'
import { handleAgentRouterPost } from '../handler'

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/agent-router/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('agent router API handler', () => {
  it('returns a route decision for a valid message', async () => {
    const response = await handleAgentRouterPost(
      jsonRequest({ message: 'Help me write a PRD' })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveProperty('status')
    expect(body).toHaveProperty('decisionType')
    expect(body).toHaveProperty('confidence')
    expect(body).toHaveProperty('reason')
    expect(body).toHaveProperty('sideEffects')
    expect(typeof body.confidence).toBe('number')
  })

  it('rejects empty messages', async () => {
    const response = await handleAgentRouterPost(jsonRequest({ message: '   ' }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Message is required.')
  })

  it('rejects non-string conversation ids', async () => {
    const response = await handleAgentRouterPost(
      jsonRequest({ message: 'Write a PRD', conversationId: 123 })
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('conversationId must be a string.')
  })

  it('rejects invalid JSON', async () => {
    const response = await handleAgentRouterPost(
      new Request('http://localhost/api/agent-router/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      })
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Invalid JSON body.')
  })
})
