/**
 * POST /api/workflow-proposals/from-file-change-proposal — Create proposal from FileChangeProposal
 *
 * Safety: Read-and-snapshot only. Does not trigger any runtime.
 */

import { prisma } from '@/lib/prisma'
import { createWorkflowProposal, readJson, requiredString, stringValue, snapshotSourceEvidence, workflowErrorResponse } from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const sourceId = requiredString(body.fileChangeProposalId, 'fileChangeProposalId')

    const sourceRecord = await prisma.fileChangeProposal.findUnique({
      where: { id: sourceId },
      select: { id: true, title: true, status: true, summary: true, riskLevel: true },
    })

    if (!sourceRecord) {
      return Response.json({ ok: false, error: { code: 'not_found', message: 'Source FileChangeProposal not found.' } }, { status: 404 })
    }

    const evidenceRefs = await snapshotSourceEvidence({ sourceType: 'file_change_proposal', sourceId })

    const result = await createWorkflowProposal({
      title: `Workflow for FileChangeProposal: ${sourceRecord.title}`,
      summary: `Workflow proposal from FileChangeProposal "${sourceRecord.title}" (${sourceRecord.status}).`,
      sourceKind: 'file_change_proposal',
      sourceRecordId: sourceId,
      sourceEvidenceRefs: evidenceRefs,
      workflowIntent: 'file_git_pr_review',
      riskLevel: (sourceRecord.riskLevel as 'low' | 'medium' | 'high' | 'critical') ?? 'medium',
      createdBy: (stringValue(body.createdBy) ?? 'user') as 'user' | 'agent_record' | 'system_seed',
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })

    return Response.json({ ok: true, data: result.proposal, auditEvents: [result.auditEvent] }, { status: 201 })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}
