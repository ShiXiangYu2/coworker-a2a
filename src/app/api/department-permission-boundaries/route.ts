import {
  createDepartmentPermissionBoundary,
  createdBy,
  departmentErrorResponse,
  evidenceRefs,
  listDepartmentPermissionBoundaries,
  localActions,
  readJson,
  requiredString,
  statusParam,
  stringArray,
  stringValue,
} from '@/app/api/department-profiles/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listDepartmentPermissionBoundaries({
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
    const result = await createDepartmentPermissionBoundary({
      departmentProfileId: requiredString(body.departmentProfileId, 'departmentProfileId'),
      boundaryVersion: stringValue(body.boundaryVersion),
      allowedLocalRecordActions: localActions(body.allowedLocalRecordActions),
      deniedRuntimeActions: stringArray(body.deniedRuntimeActions),
      deniedExternalActions: stringArray(body.deniedExternalActions),
      deniedFileGitPrActions: stringArray(body.deniedFileGitPrActions),
      deniedWorkflowActions: stringArray(body.deniedWorkflowActions),
      deniedTaskActions: stringArray(body.deniedTaskActions),
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

