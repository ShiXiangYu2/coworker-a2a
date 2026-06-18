import { afterEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import type { RouteDecision } from '@/lib/agents/types'
import { createTaskFromRoute } from '@/lib/harmony/repository'
import { POST as startRun } from '../../agent-runtime/runs/from-task/route'
import { POST as contextFromTask } from '../../context-packets/from-task/route'
import { POST as contextFromAgentRun } from '../../context-packets/from-agent-run/route'
import { POST as memoryFromAgentResult } from '../candidates/from-agent-result/route'
import { POST as approveMemory } from '../[id]/approve/route'
import { POST as createKnowledge, GET as listKnowledge } from '../../knowledge/route'
import { POST as approveKnowledge } from '../../knowledge/[id]/approve/route'
import { POST as draftA2A } from '../../a2a/messages/draft/route'
import { POST as submitA2A } from '../../a2a/messages/[id]/submit-review/route'
import { POST as approveA2A } from '../../a2a/messages/[id]/approve-record/route'

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
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

async function createQueuedTask() {
  return createTaskFromRoute({
    sourceMessageText: 'Write a PRD',
    routeDecision: decision(),
  })
}

afterEach(async () => {
  await prisma.$executeRawUnsafe('DELETE FROM a2a_messages')
  await prisma.$executeRawUnsafe('DELETE FROM context_packets')
  await prisma.$executeRawUnsafe('DELETE FROM memory_entries')
  await prisma.$executeRawUnsafe('DELETE FROM knowledge_items')
  await prisma.$executeRawUnsafe('DELETE FROM agent_steps')
  await prisma.$executeRawUnsafe('DELETE FROM agent_runs')
  await prisma.harmonyAuditEvent.deleteMany()
  await prisma.harmonyConfirmationArtifact.deleteMany()
  await prisma.harmonyTaskStep.deleteMany()
  await prisma.harmonyTaskRun.deleteMany()
  await prisma.harmonyTask.deleteMany()
})

describe('Sprint 5 Memory / Knowledge / Context / A2A API', () => {
  it('creates a pre-run ContextPacket from Task without starting AgentRun', async () => {
    const taskBundle = await createQueuedTask()
    const response = await contextFromTask(
      jsonRequest('http://localhost/api/context-packets/from-task', {
        taskId: taskBundle.task!.id,
        idempotencyKey: 'ctx-task-1',
      })
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.data.status).toBe('draft')

    const agentRuns = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM agent_runs WHERE taskId = ${taskBundle.task!.id}
    `
    expect(agentRuns).toHaveLength(0)
  })

  it('creates audit-only ContextPacket for completed AgentRun', async () => {
    const taskBundle = await createQueuedTask()
    const created = await startRun(
      jsonRequest('http://localhost/api/agent-runtime/runs/from-task', {
        taskId: taskBundle.task!.id,
        idempotencyKey: 'agent-run-s5',
      })
    )
    const agentRun = await created.json()

    const response = await contextFromAgentRun(
      jsonRequest('http://localhost/api/context-packets/from-agent-run', {
        agentRunId: agentRun.agentRun.id,
        idempotencyKey: 'ctx-run-1',
      })
    )
    const body = await response.json()

    expect(body.data.status).toBe('audit_only')
    expect(body.data.agentRunId).toBe(agentRun.agentRun.id)
  })

  it('rejects ContextPacket attach for failed AgentRun', async () => {
    const taskBundle = await createQueuedTask()
    const created = await startRun(
      jsonRequest('http://localhost/api/agent-runtime/runs/from-task', {
        taskId: taskBundle.task!.id,
        idempotencyKey: 'agent-run-failed-context',
      })
    )
    const agentRun = await created.json()
    await prisma.$executeRaw`
      UPDATE agent_runs SET status = ${'failed'} WHERE id = ${agentRun.agentRun.id}
    `

    const response = await contextFromAgentRun(
      jsonRequest('http://localhost/api/context-packets/from-agent-run', {
        agentRunId: agentRun.agentRun.id,
        idempotencyKey: 'ctx-run-failed',
      })
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.message).toContain('created/running/blocked')
  })

  it('creates and approves MemoryEntry candidates without triggering AgentRun', async () => {
    const taskBundle = await createQueuedTask()
    const created = await startRun(
      jsonRequest('http://localhost/api/agent-runtime/runs/from-task', {
        taskId: taskBundle.task!.id,
        idempotencyKey: 'agent-run-memory',
      })
    )
    const agentRun = await created.json()

    const beforeRuns = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM agent_runs
    `

    const memoryResponse = await memoryFromAgentResult(
      jsonRequest('http://localhost/api/memory/candidates/from-agent-result', {
        agentRunId: agentRun.agentRun.id,
        taskId: taskBundle.task!.id,
        agentId: 'jobs',
        idempotencyKey: 'memory-run-1',
      })
    )
    const memoryBody = await memoryResponse.json()
    expect(memoryBody.data[0].status).toBe('candidate')

    const approveResponse = await approveMemory(
      jsonRequest('http://localhost/api/memory/id/approve', {
        reviewedBy: 'kelvin',
        decisionReason: 'Approved local memory only.',
      }),
      { params: Promise.resolve({ id: memoryBody.data[0].id }) }
    )
    const approveBody = await approveResponse.json()
    expect(approveBody.data.status).toBe('approved')

    const afterRuns = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM agent_runs
    `
    expect(afterRuns[0].count).toBe(beforeRuns[0].count)
  })

  it('creates and approves KnowledgeItem without triggering AgentRun', async () => {
    const beforeRuns = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM agent_runs
    `
    const created = await createKnowledge(
      jsonRequest('http://localhost/api/knowledge', {
        title: 'Sprint 5 safety',
        content: 'No RAG or external API.',
        kind: 'safety_policy',
        scope: 'global',
        tags: ['sprint5'],
      })
    )
    const body = await created.json()
    expect(body.data.status).toBe('draft')

    const approved = await approveKnowledge(
      jsonRequest('http://localhost/api/knowledge/id/approve', {
        reviewedBy: 'kelvin',
        decisionReason: 'Approved local knowledge only.',
      }),
      { params: Promise.resolve({ id: body.data.id }) }
    )
    const approvedBody = await approved.json()
    expect(approvedBody.data.status).toBe('approved')

    const listed = await listKnowledge(new Request('http://localhost/api/knowledge?status=approved'))
    const listedBody = await listed.json()
    expect(listedBody.data).toHaveLength(1)

    const afterRuns = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM agent_runs
    `
    expect(afterRuns[0].count).toBe(beforeRuns[0].count)
  })

  it('approves A2AMessage as local record only without sending or starting Agent', async () => {
    const taskBundle = await createQueuedTask()
    const beforeRuns = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM agent_runs
    `

    const draft = await draftA2A(
      jsonRequest('http://localhost/api/a2a/messages/draft', {
        taskId: taskBundle.task!.id,
        fromAgentId: 'jobs',
        toAgentId: 'kelvin',
        intent: 'escalate_to_kelvin',
        subject: 'Owner review',
        body: 'Please review this local draft.',
      })
    )
    const draftBody = await draft.json()
    expect(draftBody.data.status).toBe('draft')

    const submitted = await submitA2A(
      jsonRequest('http://localhost/api/a2a/messages/id/submit-review', {
        decisionReason: 'Submit local draft only.',
      }),
      { params: Promise.resolve({ id: draftBody.data.id }) }
    )
    const submittedBody = await submitted.json()
    expect(submittedBody.data.status).toBe('queued_for_review')

    const approved = await approveA2A(
      jsonRequest('http://localhost/api/a2a/messages/id/approve-record', {
        reviewedBy: 'kelvin',
        decisionReason: 'Approved local record only.',
      }),
      { params: Promise.resolve({ id: draftBody.data.id }) }
    )
    const approvedBody = await approved.json()
    expect(approvedBody.data.status).toBe('approved_record')

    const afterRuns = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM agent_runs
    `
    expect(afterRuns[0].count).toBe(beforeRuns[0].count)
  })
})
