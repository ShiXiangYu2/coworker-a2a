import {
  createDepartmentAssignmentProposal,
  createdBy,
  departmentAssignmentErrorResponse,
  evidenceRefs,
  listDepartmentAssignmentProposals,
  readJson,
  requiredString,
  statusParam,
  stringArray,
  stringValue,
} from '../department-task-intakes/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listDepartmentAssignmentProposals({ status: statusParam(url.searchParams.get('status')), intakeRecordId: stringValue(url.searchParams.get('intakeRecordId')), sourceTaskId: stringValue(url.searchParams.get('sourceTaskId')), departmentProfileId: stringValue(url.searchParams.get('departmentProfileId')), limit: Number(url.searchParams.get('limit') ?? 50) })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return departmentAssignmentErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = await createDepartmentAssignmentProposal({
      intakeRecordId: requiredString(body.intakeRecordId, 'intakeRecordId'),
      sourceTaskId: requiredString(body.sourceTaskId, 'sourceTaskId'),
      proposedDepartmentProfileId: requiredString(body.proposedDepartmentProfileId, 'proposedDepartmentProfileId'),
      proposedPrimaryRoleId: requiredString(body.proposedPrimaryRoleId, 'proposedPrimaryRoleId'),
      proposedSupportingRoleIds: stringArray(body.proposedSupportingRoleIds),
      assignmentRationale: requiredString(body.assignmentRationale, 'assignmentRationale'),
      responsibilitySummary: requiredString(body.responsibilitySummary, 'responsibilitySummary'),
      evidenceCoverageSummary: requiredString(body.evidenceCoverageSummary, 'evidenceCoverageSummary'),
      riskSummary: requiredString(body.riskSummary, 'riskSummary'),
      escalationPolicyRef: stringValue(body.escalationPolicyRef),
      permissionBoundaryRef: stringValue(body.permissionBoundaryRef),
      sanitizedEvidenceRefs: evidenceRefs(body.sanitizedEvidenceRefs),
      createdBy: createdBy(body.createdBy),
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return departmentAssignmentErrorResponse(error)
  }
}
