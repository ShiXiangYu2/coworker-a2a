/**
 * POST /api/workflow-proposals/from-external-action-proposal — Create proposal from ExternalActionProposal
 *
 * Safety: Read-and-snapshot only. Does not trigger any runtime.
 */

import { prisma } from '@/lib/prisma'
import { createWorkflowProposal, readJson, requiredString, stringValue, snapshotSourceEvidence, workflowErrorResponse } from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const sourceId = requiredString(body.externalActionProposalId, 'externalActionProposalId')

    const sourceRecord = await prisma.externalActionProposal.findUnique({
      where: { id: sourceId },
      select: { id: true, title: true, status: true, summary: true, riskLevel: true },
    })

    if (!sourceRecord) {
      return Response.json({ ok: false, error: { code: 'not_found', message: 'Source ExternalActionProposal not found.' } }, { status: 404 })
    }

    const evidenceRefs = await snapshotSourceEvidence({ sourceType: 'external_action_proposal', sourceId })

    const result = await createWorkflowProposal({
      title: `Workflow for ExternalActionProposal: ${sourceRecord.title}`,
      summary: `Workflow proposal from ExternalActionProposal "${sourceRecord.title}" (${sourceRecord.status}).`,
      sourceKind: 'external_action_proposal',
      sourceRecordId: sourceId,
      sourceEvidenceRefs: evidenceRefs,
      workflowIntent: 'external_governance',
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
