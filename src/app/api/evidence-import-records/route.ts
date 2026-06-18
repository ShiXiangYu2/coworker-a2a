import { prisma } from '@/lib/prisma'
import {
  createEvidenceImportRecord,
  evidenceErrorResponse,
  readJson,
  requiredString,
  sourceKind,
  sourceMetadata,
  stringArray,
  stringValue,
} from '@/app/api/evidence/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const where: Record<string, unknown> = { targetSprint: 'sprint_17' }
    const status = url.searchParams.get('status')
    const kind = url.searchParams.get('sourceKind')
    if (status) where.status = status
    if (kind) where.sourceKind = kind
    const records = await prisma.evidenceImportRecord.findMany({
      where,
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
    const result = await createEvidenceImportRecord({
      sourceKind: sourceKind(body.sourceKind),
      title: requiredString(body.title, 'title'),
      userProvidedSummary: requiredString(body.userProvidedSummary ?? body.summary, 'userProvidedSummary'),
      importedContentSummary: stringValue(body.importedContentSummary),
      sourceProfileId: stringValue(body.sourceProfileId),
      redactionPolicyId: stringValue(body.redactionPolicyId),
      sourceMetadata: sourceMetadata(body.sourceMetadata),
      sourceLimitations: stringArray(body.sourceLimitations),
      riskFindings: stringArray(body.riskFindings),
      openIssues: stringArray(body.openIssues),
      createdBy: (stringValue(body.createdBy) ?? 'user') as never,
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({
      ok: true,
      data: result.record,
      snapshot: result.snapshot,
      auditEvents: result.auditEvents,
      safetyNote: result.safetyNote,
    }, { status: 201 })
  } catch (error) {
    return evidenceErrorResponse(error)
  }
}
