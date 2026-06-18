import {
  createDepartmentEscalationPolicy,
  createdBy,
  departmentErrorResponse,
  evidenceRefs,
  listDepartmentEscalationPolicies,
  readJson,
  requiredString,
  statusParam,
  stringArray,
  stringValue,
} from '@/app/api/department-profiles/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listDepartmentEscalationPolicies({
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
    const result = await createDepartmentEscalationPolicy({
      departmentProfileId: requiredString(body.departmentProfileId, 'departmentProfileId'),
      policyVersion: stringValue(body.policyVersion),
      escalationTriggers: stringArray(body.escalationTriggers),
      escalationTargets: stringArray(body.escalationTargets),
      humanReviewRequired: body.humanReviewRequired === false ? false : true,
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

