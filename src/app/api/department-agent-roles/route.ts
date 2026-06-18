import {
  createDepartmentAgentRole,
  createdBy,
  departmentErrorResponse,
  evidenceRefs,
  listDepartmentAgentRoles,
  localActions,
  readJson,
  requiredString,
  seniority,
  statusParam,
  stringArray,
  stringValue,
} from '@/app/api/department-profiles/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listDepartmentAgentRoles({
      status: statusParam(url.searchParams.get('status')),
      departmentProfileId: stringValue(url.searchParams.get('departmentProfileId')),
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
    const result = await createDepartmentAgentRole({
      departmentProfileId: requiredString(body.departmentProfileId, 'departmentProfileId'),
      roleKey: requiredString(body.roleKey, 'roleKey'),
      displayName: requiredString(body.displayName, 'displayName'),
      roleMission: requiredString(body.roleMission, 'roleMission'),
      seniority: seniority(body.seniority),
      allowedLocalActions: localActions(body.allowedLocalActions),
      deniedRuntimeActions: stringArray(body.deniedRuntimeActions),
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

