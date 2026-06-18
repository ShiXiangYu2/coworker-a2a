import { afterEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import type { RouteDecision } from '@/lib/agents/types'
import { createTaskFromRoute } from '@/lib/harmony/repository'
import { POST as startRun } from '../../agent-runtime/runs/from-task/route'
import { POST as createToolCalls } from '../../tool-calls/from-agent-result/route'
import { POST as planExecution } from '../../tool-runs/[id]/plan-execution/route'
import { POST as submitConfirmation } from '../../tool-execution-plans/[id]/submit-confirmation/route'
import { POST as approveExecution } from '../../tool-runs/[id]/approve-execution/route'
import { POST as executeApproved } from '../../tool-runs/[id]/execute-approved/route'
import { GET as getPolicy } from '../../tool-execution-policy/route'

function jsonRequest(url: string, body: unknown = {}): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function decision(): RouteDecision {
  return {
    status: 'ready',
    decisionType: 'delegate_to_agent',
    targetAgentId: 'jobs',
    confidence: 0.88,
    reason: 'Route to Jobs.',
    matchedSignals: ['prd'],
    requiresHumanConfirmation: false,
    next: { recommendedAction: 'show_route_suggestion', reason: 'Create task.' },
    sideEffects: { filesChanged: [], branchesCreated: [], prsCreated: [], issuesUpdated: [] },
  }
}

async function createToolCall() {
  const taskBundle = await createTaskFromRoute({
    sourceMessageText: 'Write a PRD',
    routeDecision: decision(),
  })
  const runResponse = await startRun(
    jsonRequest('http://localhost/api/agent-runtime/runs/from-task', {
      taskId: taskBundle.task!.id,
      idempotencyKey: `agent-s11-${taskBundle.task!.id}`,
    })
  )
  const runBody = await runResponse.json()
  const created = await createToolCalls(
    jsonRequest('http://localhost/api/tool-calls/from-agent-result', {
      agentRunId: runBody.agentRun.id,
      idempotencyKey: `tool-s11-${runBody.agentRun.id}`,
    })
  )
  const body = await created.json()
  return { taskId: taskBundle.task!.id, toolCallId: body.data[0].toolCall.id }
}

afterEach(async () => {
  await prisma.$executeRawUnsafe('DELETE FROM tool_execution_receipts')
  await prisma.$executeRawUnsafe('DELETE FROM tool_execution_plans')
  await prisma.$executeRawUnsafe('DELETE FROM recovery_points')
  await prisma.$executeRawUnsafe('DELETE FROM observability_events')
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

describe('Sprint 11 controlled tool execution API', () => {
  it('exposes default-deny execution policy', async () => {
    const response = await getPolicy()
    const body = await response.json()
    expect(body.data.defaultDecision).toBe('deny')
    expect(body.data.allowedToolCategories).toEqual(['internal_noop', 'read_simulated'])
    expect(body.data.deniedToolCategories).toContain('read')
    expect(body.data.allowRetry).toBe(false)
  })

  it('plans, confirms, approves, and executes only an approved deterministic local ToolRun', async () => {
    const { taskId, toolCallId } = await createToolCall()
    const planned = await planExecution(new Request('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: toolCallId }),
    })
    const plannedBody = await planned.json()
    expect(planned.status).toBe(200)
    expect(plannedBody.data.toolRun.status).toBe('awaiting_confirmation')
    expect(plannedBody.data.executionPlan.status).toBe('ready_for_confirmation')
    expect(plannedBody.data.executionPlan.recoveryPointId).toBeTruthy()

    const planId = plannedBody.data.executionPlan.id
    const toolRunId = plannedBody.data.toolRun.id
    const confirmed = await submitConfirmation(jsonRequest('http://localhost', {
      decisionReason: 'Approve one controlled local ToolRun only.',
    }), { params: Promise.resolve({ id: planId }) })
    const confirmedBody = await confirmed.json()
    expect(confirmedBody.data.executionPlan.status).toBe('ready_for_confirmation')

    const approved = await approveExecution(new Request('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: toolRunId }),
    })
    const approvedBody = await approved.json()
    expect(approvedBody.data.toolRun.status).toBe('approved_for_execution')
    expect(approvedBody.data.executionPlan.status).toBe('approved_record')

    const executed = await executeApproved(new Request('http://localhost', { method: 'POST' }), {
      params: Promise.resolve({ id: toolRunId }),
    })
    const executedBody = await executed.json()
    expect(executed.status).toBe(200)
    expect(executedBody.data.toolRun.status).toBe('succeeded')
    expect(executedBody.data.executionReceipt.sideEffects).toEqual([])

    const task = await prisma.harmonyTask.findUniqueOrThrow({ where: { id: taskId } })
    expect(task.status).not.toBe('completed')
    const agentRuns = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM agent_runs WHERE taskId = ${taskId}
    `
    expect(agentRuns).toHaveLength(1)
  })
})
