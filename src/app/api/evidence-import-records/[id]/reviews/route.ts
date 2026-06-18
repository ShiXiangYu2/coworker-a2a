import { prisma } from '@/lib/prisma'
import {
  createEvidenceReviewRecord,
  evidenceErrorResponse,
  readJson,
  reviewer,
  reviewVerdict,
  stringValue,
} from '@/app/api/evidence/_shared'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const records = await prisma.evidenceReviewRecord.findMany({
      where: { targetId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return evidenceErrorResponse(error)
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await readJson(request)
    const result = await createEvidenceReviewRecord({
      targetType: 'evidence_import_record',
      targetId: id,
      reviewer: reviewer(body.reviewer),
      verdict: reviewVerdict(body.verdict),
      reviewNotes: stringValue(body.reviewNotes) ?? 'Local evidence record review.',
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
