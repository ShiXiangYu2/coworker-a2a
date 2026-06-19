import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { encodeJson } from '@/lib/harmony/serializers'
import {
  approveToolRunExecution,
  createControlledToolRunFromToolCall,
  executeApprovedToolRun,
  planToolExecution,
} from '../repository'

describe('Sprint 22 repository sandbox write chain', () => {
  it('flows ToolCall -> ToolRun -> ToolExecutionPlan -> approve -> receipt', async () => {
    const id = randomUUID()
    const taskId = randomUUID()
    const targetPath = `deliverables/sprint-22/repository-${id}.txt`
    await prisma.$executeRaw`
      INSERT INTO harmony_tasks (
        id, idempotencyKey, conversationId, sourceMessageId, sourceMessageText,
        title, description, type, status, routeDecisionType, routeStatus,
        targetAgentId, confidence, reason, statusReason, matchedSignalsJson,
        routeDecisionSnapshotJson, requiresHumanConfirmation, sideEffectsJson,
        createdBy, createdAt, updatedAt
      ) VALUES (
        ${taskId}, ${`task:${id}`}, ${null}, ${null}, ${'Sprint 22 repository test'},
        ${'Sprint 22 repository test'}, ${'Test task for sandbox write repository chain.'},
        ${'test'}, ${'pending'}, ${'manual'}, ${'not_routed'}, ${null}, ${1},
        ${'Repository integration test'}, ${null}, ${encodeJson([])}, ${encodeJson({})},
        ${true}, ${encodeJson([])}, ${'system_test'}, ${new Date()}, ${new Date()}
      )
    `
    await prisma.$executeRaw`
      INSERT INTO tool_calls (
        id, idempotencyKey, correlationId, taskId, agentRunId, agentResultId, source,
        toolId, toolName, proposedByAgentId, intent, rationale, inputJson, inputSummary,
        status, riskLevel, sideEffectsJson, permissionDecisionId, confirmationArtifactId,
        sourceSnapshotJson, policyInputSnapshotJson, createdAt, updatedAt
      ) VALUES (
        ${id}, ${`sandbox-write:${id}`}, ${`corr-${id}`}, ${taskId}, ${null}, ${null}, ${'system_test'},
        ${'write.sandbox_deliverable'}, ${'write.sandbox_deliverable'}, ${null},
        ${'Write sandbox deliverable'}, ${'Sprint 22 repository integration test.'},
        ${encodeJson({ targetPath, content: 'repository sandbox write', format: 'txt' })},
        ${targetPath}, ${'approved_record'}, ${'medium'}, ${encodeJson([])}, ${null}, ${null},
        ${null}, ${null}, ${new Date()}, ${new Date()}
      )
    `

    const created = await createControlledToolRunFromToolCall(id, {
      idempotencyKey: `controlled-tool-run:${id}`,
    })
    expect(created.toolRun.sideEffectClass).toBe('sandbox_file_write')

    const planned = await planToolExecution(created.toolRun.id)
    expect(planned.executionPlan.policyId).toBe('tool-execution-policy-sprint-22')
    expect(planned.executionPlan.sandboxProfileId).toBe('sandbox-file-write-deliverables-sprint-22')
    expect(planned.executionPlan.allowedWriteRoot).toBe('deliverables')
    expect(planned.executionPlan.expectedOutputPath).toBe(targetPath)

    if (!planned.executionPlan.confirmationArtifactId) {
      throw new Error('expected confirmationArtifactId')
    }
    await prisma.harmonyConfirmationArtifact.update({
      where: { id: planned.executionPlan.confirmationArtifactId },
      data: { status: 'approved', approvedBy: 'kelvin', approvedAt: new Date() },
    })
    const approved = await approveToolRunExecution(created.toolRun.id)
    const executed = await executeApprovedToolRun(approved.toolRun.id)

    expect(executed.executionReceipt.sideEffectClass).toBe('sandbox_file_write')
    expect(executed.executionReceipt.outputPath).toContain(targetPath.replaceAll('/', '\\'))
    expect(executed.executionReceipt.bytesWritten).toBe(Buffer.byteLength('repository sandbox write'))
    expect(await readFile(executed.executionReceipt.outputPath!, 'utf8')).toBe('repository sandbox write')
  })
})
