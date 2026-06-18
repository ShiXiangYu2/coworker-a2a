import {
  auditActorType,
  auditEventType,
  auditTargetType,
  createDepartmentAssignmentAudit,
  createdBy,
  departmentAssignmentErrorResponse,
  evidenceRefs,
  listDepartmentAssignmentAudits,
  readJson,
  requiredString,
  statusParam,
  stringValue,
} from '../department-task-intakes/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listDepartmentAssignmentAudits({ status: statusParam(url.searchParams.get('status')), targetId: stringValue(url.searchParams.get('targetId')), limit: Number(url.searchParams.get('limit') ?? 50) })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return departmentAssignmentErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = await createDepartmentAssignmentAudit({
      targetType: auditTargetType(requiredString(body.targetType, 'targetType')),
      targetId: requiredString(body.targetId, 'targetId'),
      eventType: auditEventType(body.eventType),
      actorType: auditActorType(body.actorType),
      actorId: stringValue(body.actorId),
      beforeStatus: statusParam(stringValue(body.beforeStatus) ?? null),
      afterStatus: statusParam(stringValue(body.afterStatus) ?? null),
      reason: requiredString(body.reason, 'reason'),
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
