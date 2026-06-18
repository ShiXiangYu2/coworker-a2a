/**
 * POST /api/workflow-proposals/from-tool-run — Create proposal from existing ToolRun
 *
 * Safety: Read-and-snapshot ONLY.
 * Does NOT execute ToolRun, request ToolRun permission,
 * approve ToolRun execution, execute-approved ToolRun,
 * or mutate ToolRun state in any way.
 */

import { prisma } from '@/lib/prisma'
import { createWorkflowProposal, readJson, requiredString, stringValue, snapshotSourceEvidence, workflowErrorResponse } from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const sourceId = requiredString(body.toolRunId, 'toolRunId')

    // Safety: read-only snapshot of source record
    // Does NOT execute ToolRun, request permission, approve execution, or execute-approved
    const sourceRecord = await prisma.toolRun.findUnique({
      where: { id: sourceId },
      select: { id: true, toolId: true, status: true, mode: true, taskId: true },
    })

    if (!sourceRecord) {
      return Response.json({ ok: false, error: { code: 'not_found', message: 'Source ToolRun not found.' } }, { status: 404 })
    }

    const evidenceRefs = await snapshotSourceEvidence({ sourceType: 'tool_run', sourceId })

    const result = await createWorkflowProposal({
      title: `Workflow for ToolRun: ${sourceRecord.toolId}`,
      summary: `Workflow proposal created from ToolRun ${sourceRecord.toolId} (${sourceRecord.status}). Read-and-snapshot only — no ToolRun execution, permission request, or approval.`,
      sourceKind: 'tool_run',
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
