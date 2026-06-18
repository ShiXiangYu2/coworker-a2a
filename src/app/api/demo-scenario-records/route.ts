import { prisma } from '@/lib/prisma'
import {
  createDemoScenarioRecord,
  mvpClosureErrorResponse,
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
    const scenarioKind = url.searchParams.get('scenarioKind') ?? undefined
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (scenarioKind) where.scenarioKind = scenarioKind

    const records = await prisma.demoScenarioRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return mvpClosureErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = await createDemoScenarioRecord({
      title: requiredString(body.title, 'title'),
      summary: requiredString(body.summary, 'summary'),
      scenarioKind: (stringValue(body.scenarioKind) ?? 'demo_script') as never,
      entryPoint: (stringValue(body.entryPoint) ?? 'chathub') as never,
      orderedEvidenceRefs: objectArray(body.orderedEvidenceRefs),
      expectedScreens: stringArray(body.expectedScreens),
      expectedLocalRecords: stringArray(body.expectedLocalRecords),
      forbiddenRuntimeActions: stringArray(body.forbiddenRuntimeActions),
      demoScriptMarkdown: requiredString(body.demoScriptMarkdown, 'demoScriptMarkdown'),
      seedDataRefs: stringArray(body.seedDataRefs),
      createdBy: (stringValue(body.createdBy) ?? 'user') as never,
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return mvpClosureErrorResponse(error)
  }
}

