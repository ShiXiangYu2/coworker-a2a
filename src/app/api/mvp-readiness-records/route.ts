import { prisma } from '@/lib/prisma'
import {
  createMVPReadinessRecord,
  mvpClosureErrorResponse,
  normalizeEvidenceRefs,
  objectArray,
  readJson,
  requiredString,
  stringArray,
  stringValue,
} from './_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') ?? undefined
    const readinessScope = url.searchParams.get('readinessScope') ?? undefined
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (readinessScope) where.readinessScope = readinessScope

    const records = await prisma.mVPReadinessRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return Response.json({ ok: true, data: records })
  } catch (error) {
    return mvpClosureErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = await createMVPReadinessRecord({
      title: requiredString(body.title, 'title'),
      summary: requiredString(body.summary, 'summary'),
      targetVersion: stringValue(body.targetVersion) ?? 'mvp-local',
      readinessScope: (stringValue(body.readinessScope) ?? 'stage_closure') as never,
      evidenceRefs: normalizeEvidenceRefs(body.evidenceRefs),
      demoScenarioRefs: stringArray(body.demoScenarioRefs),
      governanceSummaryRefs: stringArray(body.governanceSummaryRefs),
      regressionGateRefs: stringArray(body.regressionGateRefs),
      releaseReadinessRefs: stringArray(body.releaseReadinessRefs),
      riskFindings: stringArray(body.riskFindings),
      openIssues: stringArray(body.openIssues),
      acceptanceMatrix: objectArray(body.acceptanceMatrix),
      recommendation: (stringValue(body.recommendation) ?? 'needs_review') as never,
      createdBy: (stringValue(body.createdBy) ?? 'user') as never,
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })

    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return mvpClosureErrorResponse(error)
  }
}

