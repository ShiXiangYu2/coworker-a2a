import { afterEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import type { RouteDecision } from '@/lib/agents/types'
import { createTaskFromRoute } from '@/lib/harmony/repository'
import { POST as createTarget } from '../../eval-targets/route'
import { POST as createRun } from '../from-target/route'

function jsonRequest(url: string, body: unknown): Request {
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
  }
}

afterEach(async () => {
  await prisma.$executeRawUnsafe('DELETE FROM eval_findings')
  await prisma.$executeRawUnsafe('DELETE FROM eval_checks')
  await prisma.$executeRawUnsafe('DELETE FROM eval_runs')
  await prisma.$executeRawUnsafe('DELETE FROM eval_targets')
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

describe('Sprint 7 Eval API', () => {
  it('creates EvalTarget and EvalRun without mutating Task status or creating ToolCall', async () => {
    const taskBundle = await createTaskFromRoute({
      sourceMessageText: 'Write a PRD',
      routeDecision: decision(),
    })
    const taskId = taskBundle.task!.id
    const beforeTask = await prisma.harmonyTask.findUniqueOrThrow({ where: { id: taskId } })

    const targetResponse = await createTarget(
      jsonRequest('http://localhost/api/eval-targets', {
        targetType: 'harmony_task',
        targetId: taskId,
        idempotencyKey: `eval-target:${taskId}`,
      })
    )
    const targetBody = await targetResponse.json()
    expect(targetResponse.status).toBe(201)
    expect(targetBody.data.targetType).toBe('harmony_task')

    const runResponse = await createRun(
      jsonRequest('http://localhost/api/eval-runs/from-target', {
        evalTargetId: targetBody.data.id,
        idempotencyKey: `eval-run:${targetBody.data.id}`,
      })
    )
    const runBody = await runResponse.json()
    expect(runResponse.status).toBe(201)
    expect(runBody.data.evalRun.qualityGateDecision.decision).toBeTruthy()
    expect(runBody.auditEvents.length).toBeGreaterThan(0)

    const afterTask = await prisma.harmonyTask.findUniqueOrThrow({ where: { id: taskId } })
    expect(afterTask.status).toBe(beforeTask.status)

    const toolCalls = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM tool_calls`
    expect(toolCalls).toHaveLength(0)
  })

  it('does not create invalid confirmation artifacts for non-task targets', async () => {
    await prisma.$executeRaw`
      INSERT INTO tool_calls (
        id, idempotencyKey, correlationId, taskId, agentRunId, agentResultId, source,
        toolId, toolName, proposedByAgentId, intent, rationale, inputJson, inputSummary,
        status, riskLevel, sideEffectsJson, permissionDecisionId, confirmationArtifactId,
        sourceSnapshotJson, policyInputSnapshotJson, createdAt, updatedAt
      ) VALUES (
        ${'tool_call_eval_test'}, ${null}, ${null}, ${null}, ${null}, ${null}, ${'system_test'},
        ${'noop.note'}, ${'noop.note'}, ${'turing'}, ${'Review permission'}, ${'Local eval test'},
        ${'{}'}, ${'local'}, ${'proposed'}, ${'critical'}, ${'["future-side-effect"]'},
        ${null}, ${null}, ${null}, ${null}, ${new Date()}, ${new Date()}
      )
    `

    const targetResponse = await createTarget(
      jsonRequest('http://localhost/api/eval-targets', {
        targetType: 'tool_call',
        targetId: 'tool_call_eval_test',
      })
    )
    const targetBody = await targetResponse.json()
    const runResponse = await createRun(
      jsonRequest('http://localhost/api/eval-runs/from-target', {
        evalTargetId: targetBody.data.id,
      })
    )
    const runBody = await runResponse.json()

    expect(runResponse.status).toBe(201)
    expect(runBody.data.findings.some((finding: { needsHumanReview: boolean }) => finding.needsHumanReview)).toBe(true)

    const confirmations = await prisma.harmonyConfirmationArtifact.findMany()
    expect(confirmations).toHaveLength(0)

    const toolCall = await prisma.$queryRaw<{ status: string }[]>`
      SELECT status FROM tool_calls WHERE id = ${'tool_call_eval_test'}
    `
    expect(toolCall[0].status).toBe('proposed')
  })
})
