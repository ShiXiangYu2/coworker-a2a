import { prisma } from '@/lib/prisma'
import {
  createEvidenceSourceProfile,
  evidenceErrorResponse,
  readJson,
  requiredString,
  sourceKind,
  stringArray,
  stringValue,
} from '@/app/api/evidence/_shared'

export async function GET() {
  try {
    const records = await prisma.evidenceSourceProfile.findMany({
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
    const result = await createEvidenceSourceProfile({
      sourceKind: sourceKind(body.sourceKind),
      displayName: requiredString(body.displayName, 'displayName'),
      description: requiredString(body.description, 'description'),
      allowedContentTypes: stringArray(body.allowedContentTypes),
      forbiddenContentTypes: stringArray(body.forbiddenContentTypes),
      createdBy: (stringValue(body.createdBy) ?? 'user') as never,
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return evidenceErrorResponse(error)
  }
}
