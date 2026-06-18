import { afterEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import type { RouteDecision } from '@/lib/agents/types'
import { createTaskFromRoute } from '@/lib/harmony/repository'
import { POST as startRun } from '../../agent-runtime/runs/from-task/route'
import { POST as createToolCalls } from '../from-agent-result/route'
import { POST as evaluatePermission } from '../[id]/evaluate-permission/route'
import { POST as approveTool } from '../../tool-confirmations/[id]/approve/route'
import { GET as listTools } from '../../tools/route'
import { GET as getPolicy } from '../../command-policy/route'

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

async function createAgentRun() {
  const taskBundle = await createTaskFromRoute({
    sourceMessageText: 'Write a PRD',
    routeDecision: decision(),
  })
  const response = await startRun(
    jsonRequest('http://localhost/api/agent-runtime/runs/from-task', {
      taskId: taskBundle.task!.id,
      idempotencyKey: `agent-${taskBundle.task!.id}`,
    })
  )
  const body = await response.json()
  return { taskId: taskBundle.task!.id, agentRunId: body.agentRun.id }
}

afterEach(async () => {
  await prisma.$executeRawUnsafe('DELETE FROM tool_runs')
  await prisma.$executeRawUnsafe('DELETE FROM tool_permissions')
  await prisma.$executeRawUnsafe('DELETE FROM tool_calls')
  await prisma.$executeRawUnsafe('DELETE FROM agent_steps')
  await prisma.$executeRawUnsafe('DELETE FROM agent_runs')
  await prisma.harmonyAuditEvent.deleteMany()
  await prisma.harmonyConfirmationArtifact.deleteMany()
  await prisma.harmonyTaskStep.deleteMany()
  await prisma.harmonyTaskRun.deleteMany()
  await prisma.harmonyTask.deleteMany()
})

describe('Sprint 6 Tool Integration API', () => {
  it('lists tools and default-deny command policy', async () => {
    const tools = await listTools()
    const policy = await getPolicy()
    const toolsBody = await tools.json()
    const policyBody = await policy.json()

    expect(toolsBody.data.some((tool: { name: string }) => tool.name === 'noop.note')).toBe(true)
    expect(policyBody.data.defaultDecision).toBe('deny')
    expect(policyBody.data.profiles[0].allowedCommands).toEqual([])
  })

  it('creates ToolCall proposal and idempotent permission with auditEvents', async () => {
    const { agentRunId } = await createAgentRun()
    const created = await createToolCalls(
      jsonRequest('http://localhost/api/tool-calls/from-agent-result', {
        agentRunId,
        idempotencyKey: `tool-${agentRunId}`,
      })
    )
    const createdBody = await created.json()
    expect(created.status).toBe(201)
    expect(createdBody.data[0].toolCall.status).toBe('proposed')
    expect(createdBody.auditEvents.length).toBeGreaterThan(0)

    const toolCallId = createdBody.data[0].toolCall.id
    const first = await evaluatePermission(new Request('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: toolCallId }),
    })
    const second = await evaluatePermission(new Request('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: toolCallId }),
    })
    const firstBody = await first.json()
    const secondBody = await second.json()

    expect(firstBody.data.latestPermission.id).toBe(secondBody.data.latestPermission.id)
    expect(firstBody.auditEvents.length).toBeGreaterThan(0)
    expect(secondBody.auditEvents).toEqual([])
  })

  it('approval for high-risk ToolCall does not create executable ToolRun, start AgentRun, or complete Task', async () => {
    const { taskId, agentRunId } = await createAgentRun()
    const created = await createToolCalls(
      jsonRequest('http://localhost/api/tool-calls/from-agent-result', {
        agentRunId,
        agentResult: {
          status: 'completed',
          confidence: 0.8,
          summary: 'Analysis only.',
          findings: [],
          proposedChanges: [],
          next: { recommendedAction: 'show_result', reason: 'Done.' },
          sideEffects: {
            filesChanged: [],
            branchesCreated: [],
            prsCreated: [],
            issuesUpdated: [],
          },
          needsHumanConfirmation: false,
          safetyNotes: ['Sprint 4 only produced structured analysis.'],
          toolCallCandidates: [
            {
              toolName: 'noop.note',
              intent: 'Future side-effect review request',
              rationale: 'High-risk request must stay local.',
              input: { note: 'Future command request requires review.' },
              inputSummary: 'Future command request',
              riskLevel: 'critical',
              requiresHumanConfirmation: true,
              sideEffects: ['future-shell-command'],
            },
          ],
        },
      })
    )
    const createdBody = await created.json()
    const toolCallId = createdBody.data[0].toolCall.id
    const evaluated = await evaluatePermission(new Request('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: toolCallId }),
    })
    const evaluatedBody = await evaluated.json()
    expect(evaluatedBody.data.toolCall.status).toBe('pending_confirmation')

    const confirmationId = evaluatedBody.data.toolCall.confirmationArtifactId
    const approved = await approveTool(
      jsonRequest('http://localhost/api/tool-confirmations/id/approve', {
        reviewedBy: 'kelvin',
        decisionReason: 'Approve local record only.',
      }),
      { params: Promise.resolve({ id: confirmationId }) }
    )
    const approvedBody = await approved.json()
    expect(approvedBody.data.status).toBe('approved_record')
    expect(approvedBody.auditEvents.length).toBeGreaterThan(0)

    const toolRuns = await prisma.$queryRaw<{ id: string; startedAt: Date | null }[]>`
      SELECT id, startedAt FROM tool_runs WHERE toolCallId = ${toolCallId}
    `
    expect(toolRuns).toHaveLength(0)

    const task = await prisma.harmonyTask.findUniqueOrThrow({ where: { id: taskId } })
    expect(task.status).not.toBe('completed')

    const agentRuns = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM agent_runs WHERE taskId = ${taskId}
    `
    expect(agentRuns).toHaveLength(1)
  })
})
