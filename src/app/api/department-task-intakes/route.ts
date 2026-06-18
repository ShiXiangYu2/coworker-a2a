import {
  createDepartmentTaskIntake,
  createdBy,
  departmentAssignmentErrorResponse,
  evidenceRefs,
  intakeSource,
  listDepartmentTaskIntakes,
  readJson,
  requiredString,
  statusParam,
  stringArray,
  stringValue,
} from './_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listDepartmentTaskIntakes({ status: statusParam(url.searchParams.get('status')), sourceTaskId: stringValue(url.searchParams.get('sourceTaskId')), limit: Number(url.searchParams.get('limit') ?? 50) })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return departmentAssignmentErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = await createDepartmentTaskIntake({
      sourceTaskId: requiredString(body.sourceTaskId, 'sourceTaskId'),
      taskTitle: requiredString(body.taskTitle, 'taskTitle'),
      taskSummary: requiredString(body.taskSummary, 'taskSummary'),
      taskType: stringValue(body.taskType),
      intakeReason: requiredString(body.intakeReason, 'intakeReason'),
      intakeSource: intakeSource(body.intakeSource),
      candidateDepartmentProfileIds: stringArray(body.candidateDepartmentProfileIds),
      candidateRoleIds: stringArray(body.candidateRoleIds),
      sanitizedEvidenceRefs: evidenceRefs(body.sanitizedEvidenceRefs),
      riskNotes: stringArray(body.riskNotes),
      createdBy: createdBy(body.createdBy),
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return departmentAssignmentErrorResponse(error)
  }
}
