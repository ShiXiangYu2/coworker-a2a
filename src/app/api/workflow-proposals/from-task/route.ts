/**
 * POST /api/workflow-proposals/from-task — Create proposal from existing Task
 *
 * Safety: Read-and-snapshot only. Does not trigger Agent runtime,
 * Tool runtime, recompute, or mutate the source Task.
 */

import { prisma } from '@/lib/prisma'
import { createWorkflowProposal, readJson, requiredString, stringValue, snapshotSourceEvidence, workflowErrorResponse } from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const sourceId = requiredString(body.taskId, 'taskId')

    // Safety: read-only snapshot of source record
    const sourceRecord = await prisma.harmonyTask.findUnique({
      where: { id: sourceId },
      select: { id: true, title: true, description: true, status: true, type: true },
    })

    if (!sourceRecord) {
      return Response.json({ ok: false, error: { code: 'not_found', message: 'Source Task not found.' } }, { status: 404 })
    }

    const evidenceRefs = await snapshotSourceEvidence({ sourceType: 'task', sourceId })

    const result = await createWorkflowProposal({
      title: `Workflow for Task: ${sourceRecord.title}`,
      summary: `Workflow proposal created from Task "${sourceRecord.title}" (${sourceRecord.status}). ${sourceRecord.description.slice(0, 200)}`,
      sourceKind: 'task',
      sourceRecordId: sourceId,
      sourceEvidenceRefs: evidenceRefs,
      workflowIntent: 'coordination',
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
