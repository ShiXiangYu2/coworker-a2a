/**
 * GET /api/workflow-proposals/:id/reviews — List reviews for a proposal
 * POST /api/workflow-proposals/:id/reviews — Create a review for a proposal
 */

import { prisma } from '@/lib/prisma'
import { createWorkflowReview, readJson, requiredString, stringValue, workflowErrorResponse } from '../../_shared'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const reviews = await prisma.workflowReviewRecord.findMany({
      where: { workflowProposalId: id },
      orderBy: { createdAt: 'desc' },
    })

    return Response.json({ ok: true, data: reviews })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await readJson(request)
    const reviewer = requiredString(body.reviewer, 'reviewer')
    const verdict = requiredString(body.verdict, 'verdict')
    const reviewNotes = requiredString(body.reviewNotes, 'reviewNotes')

    const result = await createWorkflowReview({
      workflowProposalId: id,
      workflowStepRecordId: stringValue(body.workflowStepRecordId),
      reviewer: reviewer as 'kelvin' | 'owner' | 'operator',
      verdict: verdict as 'needs_changes' | 'approved_record' | 'rejected',
      reviewNotes,
      createdBy: (stringValue(body.createdBy) ?? 'user') as 'user' | 'agent_record' | 'system_seed',
    })

    return Response.json({ ok: true, data: result.review, auditEvents: [result.auditEvent] }, { status: 201 })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}
