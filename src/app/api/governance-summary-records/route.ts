import { prisma } from '@/lib/prisma'
import {
  createGovernanceSummaryRecord,
  isObject,
  mvpClosureErrorResponse,
  readJson,
  requiredString,
  stringArray,
  stringValue,
} from './_shared'

function recordCounts(value: unknown): Record<string, number> {
  if (!isObject(value)) return {}
  const result: Record<string, number> = {}
  for (const [key, count] of Object.entries(value)) {
    if (typeof count === 'number') result[key] = count
  }
  return result
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') ?? undefined
    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const records = await prisma.governanceSummaryRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return mvpClosureErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = await createGovernanceSummaryRecord({
      title: requiredString(body.title, 'title'),
      summary: requiredString(body.summary, 'summary'),
      recordCountsByType: recordCounts(body.recordCountsByType),
      safetyBoundarySummary: requiredString(body.safetyBoundarySummary, 'safetyBoundarySummary'),
      defaultDenySummary: requiredString(body.defaultDenySummary, 'defaultDenySummary'),
      humanConfirmationSummary: requiredString(body.humanConfirmationSummary, 'humanConfirmationSummary'),
      auditCoverageSummary: requiredString(body.auditCoverageSummary, 'auditCoverageSummary'),
      observabilityCoverageSummary: requiredString(body.observabilityCoverageSummary, 'observabilityCoverageSummary'),
      recoveryCoverageSummary: requiredString(body.recoveryCoverageSummary, 'recoveryCoverageSummary'),
      evalCoverageSummary: requiredString(body.evalCoverageSummary, 'evalCoverageSummary'),
      regressionEvidenceRefs: stringArray(body.regressionEvidenceRefs),
      releaseReadinessRefs: stringArray(body.releaseReadinessRefs),
      knownLimitations: stringArray(body.knownLimitations),
      riskFindings: stringArray(body.riskFindings),
      createdBy: (stringValue(body.createdBy) ?? 'user') as never,
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return mvpClosureErrorResponse(error)
  }
}

