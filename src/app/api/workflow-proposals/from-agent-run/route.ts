/**
 * POST /api/workflow-proposals/from-agent-run — Create proposal from existing AgentRun
 *
 * Safety: Read-and-snapshot ONLY.
 * Does NOT continue Agent, resume Agent, create new AgentRun,
 * generate new Agent execution, mutate AgentRun state, or
 * trigger Agent runtime in any way.
 */

import { prisma } from '@/lib/prisma'
import { createWorkflowProposal, readJson, requiredString, stringValue, snapshotSourceEvidence, workflowErrorResponse } from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const sourceId = requiredString(body.agentRunId, 'agentRunId')

    // Safety: read-only snapshot of source record
    // Does NOT continue Agent, resume Agent, or create new AgentRun
    const sourceRecord = await prisma.agentRun.findUnique({
      where: { id: sourceId },
      select: { id: true, agentId: true, status: true, taskId: true, trigger: true },
    })

    if (!sourceRecord) {
      return Response.json({ ok: false, error: { code: 'not_found', message: 'Source AgentRun not found.' } }, { status: 404 })
    }

    const evidenceRefs = await snapshotSourceEvidence({ sourceType: 'agent_run', sourceId })

    const result = await createWorkflowProposal({
      title: `Workflow for AgentRun: ${sourceRecord.agentId}`,
      summary: `Workflow proposal created from AgentRun ${sourceRecord.agentId} (${sourceRecord.status}). Read-and-snapshot only — no Agent continuation or resume.`,
      sourceKind: 'agent_run',
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
