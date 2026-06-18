import { afterEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import type { RouteDecision } from '@/lib/agents/types'
import { POST as createFromRoute } from '../tasks/from-route/route'
import { GET as getTask } from '../tasks/[id]/route'
import { POST as cancelTask } from '../tasks/[id]/cancel/route'
import { POST as approveConfirmation } from '../confirmations/[id]/approve/route'
import { POST as rejectConfirmation } from '../confirmations/[id]/reject/route'

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function routeDecision(overrides: Partial<RouteDecision> = {}): RouteDecision {
  return {
    status: 'ready',
    decisionType: 'delegate_to_agent',
    targetAgentId: 'jobs',
    confidence: 0.9,
    reason: 'Route to Jobs.',
    matchedSignals: ['prd'],
    requiresHumanConfirmation: false,
    next: {
      recommendedAction: 'show_route_suggestion',
      reason: 'Create task.',
    },
    sideEffects: {
      filesChanged: [],
      branchesCreated: [],
      prsCreated: [],
      issuesUpdated: [],
    },
    ...overrides,
  }
}

afterEach(async () => {
  await prisma.harmonyAuditEvent.deleteMany()
  await prisma.harmonyConfirmationArtifact.deleteMany()
  await prisma.harmonyTaskStep.deleteMany()
  await prisma.harmonyTaskRun.deleteMany()
  await prisma.harmonyTask.deleteMany()
})

describe('Harmony API', () => {
  it('validates create-from-route input', async () => {
    const response = await createFromRoute(
      jsonRequest('http://localhost/api/harmony/tasks/from-route', {
        sourceMessageText: 'hello',
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'routeDecision is required.',
    })
  })

  it('creates and reads a queued task from a route decision', async () => {
    const response = await createFromRoute(
      jsonRequest('http://localhost/api/harmony/tasks/from-route', {
        sourceMessageText: 'Write a PRD',
        idempotencyKey: 'api-test-queued',
        routeDecision: routeDecision(),
      })
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.task.status).toBe('queued')
    expect(body.auditEvents.length).toBeGreaterThan(0)

    const detail = await getTask(new Request('http://localhost'), {
      params: Promise.resolve({ id: body.task.id }),
    })
    await expect(detail.json()).resolves.toMatchObject({
      task: { id: body.task.id, status: 'queued' },
    })
  })

  it('is idempotent when an idempotency key is supplied', async () => {
    const payload = {
      sourceMessageText: 'Write a PRD',
      idempotencyKey: 'api-test-idempotent',
      routeDecision: routeDecision(),
    }

    const first = await createFromRoute(
      jsonRequest('http://localhost/api/harmony/tasks/from-route', payload)
    )
    const second = await createFromRoute(
      jsonRequest('http://localhost/api/harmony/tasks/from-route', payload)
    )

    const firstBody = await first.json()
    const secondBody = await second.json()

    expect(firstBody.task.id).toBe(secondBody.task.id)
  })

  it('cancels queued tasks', async () => {
    const created = await createFromRoute(
      jsonRequest('http://localhost/api/harmony/tasks/from-route', {
        sourceMessageText: 'Write a PRD',
        routeDecision: routeDecision(),
      })
    )
    const createdBody = await created.json()

    const response = await cancelTask(new Request('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: createdBody.task.id }),
    })
    const body = await response.json()

    expect(body.task.status).toBe('cancelled')
    expect(body.auditEvents.some((event: { eventType: string }) => event.eventType === 'task.cancelled')).toBe(true)
  })

  it('approves pending confirmation to queued only', async () => {
    const created = await createFromRoute(
      jsonRequest('http://localhost/api/harmony/tasks/from-route', {
        sourceMessageText: 'Delete and deploy',
        routeDecision: routeDecision({
          status: 'blocked',
          decisionType: 'needs_human_confirmation',
          targetAgentId: 'kelvin',
          requiresHumanConfirmation: true,
        }),
      })
    )
    const createdBody = await created.json()

    const response = await approveConfirmation(
      jsonRequest('http://localhost', { approvedBy: 'kelvin' }),
      { params: Promise.resolve({ id: createdBody.confirmationArtifact.id }) }
    )
    const body = await response.json()

    expect(body.task.status).toBe('queued')
    expect(body.confirmationArtifact.status).toBe('approved')
  })

  it('rejects pending confirmation to blocked', async () => {
    const created = await createFromRoute(
      jsonRequest('http://localhost/api/harmony/tasks/from-route', {
        sourceMessageText: 'Delete and deploy',
        routeDecision: routeDecision({
          status: 'blocked',
          decisionType: 'needs_human_confirmation',
          targetAgentId: 'kelvin',
          requiresHumanConfirmation: true,
        }),
      })
    )
    const createdBody = await created.json()

    const response = await rejectConfirmation(
      jsonRequest('http://localhost', { rejectedBy: 'kelvin' }),
      { params: Promise.resolve({ id: createdBody.confirmationArtifact.id }) }
    )
    const body = await response.json()

    expect(body.task.status).toBe('blocked')
    expect(body.confirmationArtifact.status).toBe('rejected')
  })
})
