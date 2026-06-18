/**
 * GET /api/workflow-proposals — List workflow proposals
 * POST /api/workflow-proposals — Create workflow proposal (manual)
 */

import { prisma } from '@/lib/prisma'
import { createWorkflowProposal, readJson, requiredString, stringValue, workflowErrorResponse } from './_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') ?? undefined
    const sourceKind = url.searchParams.get('sourceKind') ?? undefined
    const workflowIntent = url.searchParams.get('workflowIntent') ?? undefined

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (sourceKind) where.sourceKind = sourceKind
    if (workflowIntent) where.workflowIntent = workflowIntent

    const proposals = await prisma.workflowProposal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return Response.json({ ok: true, data: proposals })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const title = requiredString(body.title, 'title')
    const summary = requiredString(body.summary, 'summary')
    const sourceKind = requiredString(body.sourceKind, 'sourceKind')
    const workflowIntent = requiredString(body.workflowIntent, 'workflowIntent')

    const result = await createWorkflowProposal({
      title,
      summary,
      sourceKind: sourceKind as never,
      workflowIntent: workflowIntent as never,
      riskLevel: (stringValue(body.riskLevel) ?? 'medium') as never,
      sourceRecordId: stringValue(body.sourceRecordId),
      sourceEvidenceRefs: [],
      createdBy: (stringValue(body.createdBy) ?? 'user') as never,
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })

    return Response.json({ ok: true, data: result.proposal, auditEvents: [result.auditEvent] }, { status: 201 })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}
