/**
 * POST /api/workflow-proposals/from-tool-execution-receipt — Create proposal from ToolExecutionReceipt
 *
 * Safety: Read-and-snapshot only. Does not trigger any runtime.
 */

import { prisma } from '@/lib/prisma'
import { createWorkflowProposal, readJson, requiredString, stringValue, snapshotSourceEvidence, workflowErrorResponse } from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const sourceId = requiredString(body.toolExecutionReceiptId, 'toolExecutionReceiptId')

    const sourceRecord = await prisma.toolExecutionReceipt.findUnique({
      where: { id: sourceId },
      select: { id: true, toolId: true, status: true, resultSummary: true },
    })

    if (!sourceRecord) {
      return Response.json({ ok: false, error: { code: 'not_found', message: 'Source ToolExecutionReceipt not found.' } }, { status: 404 })
    }

    const evidenceRefs = await snapshotSourceEvidence({ sourceType: 'tool_execution_receipt', sourceId })

    const result = await createWorkflowProposal({
      title: `Workflow for ToolExecutionReceipt: ${sourceRecord.toolId}`,
      summary: `Workflow proposal from ToolExecutionReceipt ${sourceRecord.toolId} (${sourceRecord.status}).`,
      sourceKind: 'tool_execution_receipt',
      sourceRecordId: sourceId,
      sourceEvidenceRefs: evidenceRefs,
      workflowIntent: 'file_git_pr_review',
      riskLevel: 'medium',
      createdBy: (stringValue(body.createdBy) ?? 'user') as 'user' | 'agent_record' | 'system_seed',
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })

    return Response.json({ ok: true, data: result.proposal, auditEvents: [result.auditEvent] }, { status: 201 })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}
