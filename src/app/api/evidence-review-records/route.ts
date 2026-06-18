import { prisma } from '@/lib/prisma'
import {
  createEvidenceReviewRecord,
  evidenceErrorResponse,
  readJson,
  requiredString,
  reviewer,
  reviewTargetType,
  reviewVerdict,
  stringValue,
} from '@/app/api/evidence/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const targetId = url.searchParams.get('targetId') ?? undefined
    const records = await prisma.evidenceReviewRecord.findMany({
      where: targetId ? { targetId } : { targetSprint: 'sprint_17' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return evidenceErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = await createEvidenceReviewRecord({
      targetType: reviewTargetType(body.targetType),
      targetId: requiredString(body.targetId, 'targetId'),
      reviewer: reviewer(body.reviewer),
      verdict: reviewVerdict(body.verdict),
      reviewNotes: requiredString(body.reviewNotes, 'reviewNotes'),
      confirmationArtifactId: stringValue(body.confirmationArtifactId),
      createdBy: (stringValue(body.createdBy) ?? 'user') as never,
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return evidenceErrorResponse(error)
  }
}
