import { afterEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import type { RouteDecision } from '@/lib/agents/types'
import { createTaskFromRoute } from '@/lib/harmony/repository'
import { authenticatedJsonRequest, authenticatedRequest } from '../../__tests__/auth-helpers'
import { POST as startRun } from '../runs/from-task/route'
import { GET as getRun } from '../runs/[id]/route'
import { POST as cancelRun } from '../runs/[id]/cancel/route'
import { GET as listRuns } from '../../harmony/tasks/[id]/agent-runs/route'

function request(body: unknown): Request {
  return authenticatedJsonRequest('http://localhost/api/agent-runtime/runs/from-task', body)
}

function decision(overrides: Partial<RouteDecision> = {}): RouteDecision {
  return {
    status: 'ready',
    decisionType: 'delegate_to_agent',
    targetAgentId: 'jobs',
    confidence: 0.88,
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
  await prisma.$executeRawUnsafe('DELETE FROM agent_steps')
  await prisma.$executeRawUnsafe('DELETE FROM agent_runs')
  await prisma.harmonyAuditEvent.deleteMany()
  await prisma.harmonyConfirmationArtifact.deleteMany()
  await prisma.harmonyTaskStep.deleteMany()
  await prisma.harmonyTaskRun.deleteMany()
  await prisma.harmonyTask.deleteMany()
})

describe('Agent Runtime API', () => {
  it('validates input', async () => {
    const response = await startRun(request({}))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'taskId is required.',
    })
  })

  it('starts Agent analysis for queued tasks and leaves task assigned', async () => {
    const taskBundle = await createTaskFromRoute({
      sourceMessageText: 'Write a PRD',
      routeDecision: decision(),
    })

    const response = await startRun(
      request({ taskId: taskBundle.task!.id, idempotencyKey: 'agent-api-1' })
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.agentRun.status).toBe('completed')
    expect(body.agentRun.result.sideEffects).toEqual({
      filesChanged: [],
      branchesCreated: [],
      prsCreated: [],
      issuesUpdated: [],
    })

    const task = await prisma.harmonyTask.findUniqueOrThrow({
      where: { id: taskBundle.task!.id },
    })
    expect(task.status).toBe('assigned')

    const detail = await getRun(new Request('http://localhost'), {
      params: Promise.resolve({ id: body.agentRun.id }),
    })
    await expect(detail.json()).resolves.toMatchObject({
      agentRun: { id: body.agentRun.id },
    })
  })

  it('is idempotent by idempotency key', async () => {
    const taskBundle = await createTaskFromRoute({
      sourceMessageText: 'Write a PRD',
      routeDecision: decision(),
    })
    const payload = { taskId: taskBundle.task!.id, idempotencyKey: 'agent-api-idem' }

    const first = await startRun(request(payload))
    const second = await startRun(request(payload))
    const firstBody = await first.json()
    const secondBody = await second.json()

    expect(firstBody.agentRun.id).toBe(secondBody.agentRun.id)
  })

  it('rejects pending confirmation tasks', async () => {
    const taskBundle = await createTaskFromRoute({
      sourceMessageText: 'Delete files',
      routeDecision: decision({
        status: 'blocked',
        decisionType: 'needs_human_confirmation',
        targetAgentId: 'kelvin',
        requiresHumanConfirmation: true,
      }),
    })

    const response = await startRun(request({ taskId: taskBundle.task!.id }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Only queued tasks can start Agent analysis.')
  })

  it.each(['blocked', 'cancelled', 'failed', 'completed'])(
    'rejects %s tasks',
    async (status) => {
      const taskBundle = await createTaskFromRoute({
        sourceMessageText: 'Write a PRD',
        routeDecision: decision(),
      })
      await prisma.harmonyTask.update({
        where: { id: taskBundle.task!.id },
        data: { status },
      })

      const response = await startRun(request({ taskId: taskBundle.task!.id }))
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toBe('Only queued tasks can start Agent analysis.')
    }
  )

  it('rejects Kelvin tasks by default', async () => {
    const taskBundle = await createTaskFromRoute({
      sourceMessageText: 'Owner review',
      routeDecision: decision({
        decisionType: 'create_task',
        targetAgentId: 'kelvin',
      }),
    })

    const response = await startRun(request({ taskId: taskBundle.task!.id }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Kelvin is reserved for human confirmation.')
  })

  it('rejects tasks with non-empty persisted side effects', async () => {
    const taskBundle = await createTaskFromRoute({
      sourceMessageText: 'Write a PRD',
      routeDecision: decision(),
    })
    await prisma.harmonyTask.update({
      where: { id: taskBundle.task!.id },
      data: {
        sideEffectsJson: JSON.stringify({
          filesChanged: ['file.ts'],
          branchesCreated: [],
          prsCreated: [],
          issuesUpdated: [],
        }),
      },
    })

    const response = await startRun(request({ taskId: taskBundle.task!.id }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Task sideEffects must be empty.')
  })

  it('lists and cancels agent runs when cancellable', async () => {
    const taskBundle = await createTaskFromRoute({
      sourceMessageText: 'Write a PRD',
      routeDecision: decision(),
    })
    const created = await startRun(
      request({ taskId: taskBundle.task!.id, idempotencyKey: 'agent-api-list' })
    )
    const createdBody = await created.json()

    const list = await listRuns(new Request('http://localhost'), {
      params: Promise.resolve({ id: taskBundle.task!.id }),
    })
    const listBody = await list.json()
    expect(listBody).toHaveLength(1)

    const cancel = await cancelRun(authenticatedRequest('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: createdBody.agentRun.id }),
    })
    expect(cancel.status).toBe(400)
  })
})
