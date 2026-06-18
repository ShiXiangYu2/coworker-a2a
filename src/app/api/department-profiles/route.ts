import {
  createDepartmentProfile,
  departmentErrorResponse,
  evidenceRefs,
  listDepartmentProfiles,
  profileKind,
  readJson,
  requiredString,
  statusParam,
  stringArray,
  stringValue,
  createdBy,
} from './_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listDepartmentProfiles({
      status: statusParam(url.searchParams.get('status')),
      limit: Number(url.searchParams.get('limit') ?? 50),
    })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return departmentErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = await createDepartmentProfile({
      departmentKey: requiredString(body.departmentKey, 'departmentKey'),
      displayName: requiredString(body.displayName, 'displayName'),
      profileKind: profileKind(body.profileKind),
      mission: requiredString(body.mission, 'mission'),
      responsibilitySummary: requiredString(body.responsibilitySummary, 'responsibilitySummary'),
      excludedResponsibilities: stringArray(body.excludedResponsibilities),
      evidenceRefs: evidenceRefs(body.evidenceRefs),
      createdBy: createdBy(body.createdBy),
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return departmentErrorResponse(error)
  }
}

