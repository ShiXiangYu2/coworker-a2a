/**
 * GET /api/workflow-proposals/:id/steps — List steps for a proposal
 * POST /api/workflow-proposals/:id/steps — Create a step for a proposal
 */

import { prisma } from '@/lib/prisma'
import { createWorkflowStep, readJson, requiredString, stringValue, stringArray, workflowErrorResponse } from '../../_shared'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const steps = await prisma.workflowStepRecord.findMany({
      where: { workflowProposalId: id },
      orderBy: { stepIndex: 'asc' },
    })

    return Response.json({ ok: true, data: steps })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await readJson(request)
    const stepIndex = typeof body.stepIndex === 'number' ? body.stepIndex : 0
    const title = requiredString(body.title, 'title')
    const summary = requiredString(body.summary, 'summary')
    const stepKind = requiredString(body.stepKind, 'stepKind')
    const referencedRecordType = requiredString(body.referencedRecordType, 'referencedRecordType')

    const result = await createWorkflowStep({
      workflowProposalId: id,
      stepIndex,
      title,
      summary,
      stepKind: stepKind as 'inspect_record' | 'review_record' | 'approve_record' | 'reject_record' | 'compare_evidence' | 'assess_risk' | 'document_decision',
      referencedRecordType,
      referencedRecordId: stringValue(body.referencedRecordId),
      sourceEvidenceRefs: [],
      dependsOnStepIds: stringArray(body.dependsOnStepIds),
      blockedByStepIds: stringArray(body.blockedByStepIds),
      forbiddenExecutionReason: stringValue(body.forbiddenExecutionReason) ?? 'Sprint 14 step records do not execute.',
      requiresKelvinConfirmation: typeof body.requiresKelvinConfirmation === 'boolean' ? body.requiresKelvinConfirmation : false,
      createdBy: (stringValue(body.createdBy) ?? 'user') as 'user' | 'agent_record' | 'system_seed',
    })

    return Response.json({ ok: true, data: result.step, auditEvents: [result.auditEvent] }, { status: 201 })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}
