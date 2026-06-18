import {
  createDepartmentRoleFitReview,
  createdBy,
  departmentAssignmentErrorResponse,
  evidenceRefs,
  fitLevel,
  listDepartmentRoleFitReviews,
  optionalNumber,
  readJson,
  requiredString,
  roleType,
  statusParam,
  stringArray,
  stringValue,
} from '../department-task-intakes/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listDepartmentRoleFitReviews({ status: statusParam(url.searchParams.get('status')), assignmentProposalId: stringValue(url.searchParams.get('assignmentProposalId')), departmentProfileId: stringValue(url.searchParams.get('departmentProfileId')), limit: Number(url.searchParams.get('limit') ?? 50) })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return departmentAssignmentErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = await createDepartmentRoleFitReview({
      assignmentProposalId: requiredString(body.assignmentProposalId, 'assignmentProposalId'),
      departmentProfileId: requiredString(body.departmentProfileId, 'departmentProfileId'),
      roleId: requiredString(body.roleId, 'roleId'),
      roleType: roleType(body.roleType),
      fitScore: optionalNumber(body.fitScore),
      fitLevel: fitLevel(body.fitLevel),
      fitRationale: requiredString(body.fitRationale, 'fitRationale'),
      missingCapabilityNotes: stringArray(body.missingCapabilityNotes),
      evidenceRefs: evidenceRefs(body.evidenceRefs),
      createdBy: createdBy(body.createdBy),
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return departmentAssignmentErrorResponse(error)
  }
}
