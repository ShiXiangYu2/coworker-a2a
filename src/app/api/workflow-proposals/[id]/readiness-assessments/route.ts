/**
 * GET /api/workflow-proposals/:id/readiness-assessments — List readiness assessments
 * POST /api/workflow-proposals/:id/readiness-assessments — Create a readiness assessment
 */

import { prisma } from '@/lib/prisma'
import { createWorkflowReadiness, readJson, requiredString, stringValue, stringArray, workflowErrorResponse } from '../../_shared'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const assessments = await prisma.workflowReadinessAssessment.findMany({
      where: { workflowProposalId: id },
      orderBy: { createdAt: 'desc' },
    })

    return Response.json({ ok: true, data: assessments })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await readJson(request)
    const recommendation = requiredString(body.recommendation, 'recommendation')

    const result = await createWorkflowReadiness({
      workflowProposalId: id,
      riskFindings: stringArray(body.riskFindings) ?? [],
      missingEvidence: stringArray(body.missingEvidence) ?? [],
      blockedReasons: stringArray(body.blockedReasons) ?? [],
      recommendation: recommendation as 'needs_review' | 'request_changes' | 'approve_record' | 'reject_record',
      createdBy: (stringValue(body.createdBy) ?? 'user') as 'user' | 'agent_record' | 'system_seed',
    })

    return Response.json({ ok: true, data: result.assessment, auditEvents: [result.auditEvent] }, { status: 201 })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}
