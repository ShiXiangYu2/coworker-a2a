import { prisma } from '@/lib/prisma'
import {
  createMVPReviewRecord,
  mvpClosureErrorResponse,
  readJson,
  requiredString,
  stringValue,
} from './_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const targetType = url.searchParams.get('targetType') ?? undefined
    const targetId = url.searchParams.get('targetId') ?? undefined
    const status = url.searchParams.get('status') ?? undefined
    const where: Record<string, unknown> = {}
    if (targetType) where.targetType = targetType
    if (targetId) where.targetId = targetId
    if (status) where.status = status

    const records = await prisma.mVPReviewRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return mvpClosureErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = await createMVPReviewRecord({
      targetType: requiredString(body.targetType, 'targetType') as never,
      targetId: requiredString(body.targetId, 'targetId'),
      reviewer: (stringValue(body.reviewer) ?? 'kelvin') as never,
      verdict: (stringValue(body.verdict) ?? 'needs_changes') as never,
      reviewNotes: requiredString(body.reviewNotes, 'reviewNotes'),
      confirmationArtifactId: stringValue(body.confirmationArtifactId),
      createdBy: (stringValue(body.createdBy) ?? 'user') as never,
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return mvpClosureErrorResponse(error)
  }
}

