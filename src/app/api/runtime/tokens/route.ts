import {
  actionParam,
  connectorParam,
  createRuntimeExecutionToken,
  limitParam,
  listRuntimeExecutionTokens,
  planValue,
  readJson,
  requiredString,
  runtimeExecutionErrorResponse,
  scopeValue,
  statusParam,
  stringValue,
} from '../_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listRuntimeExecutionTokens({
      status: statusParam(url.searchParams.get('status')),
      taskId: stringValue(url.searchParams.get('taskId')),
      connectorId: connectorParam(url.searchParams.get('connectorId')),
      actionType: actionParam(url.searchParams.get('actionType')),
      limit: limitParam(url.searchParams.get('limit')),
    })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = await createRuntimeExecutionToken({
      taskId: requiredString(body.taskId, 'taskId'),
      agentRunId: requiredString(body.agentRunId, 'agentRunId'),
      executionPlanRecordId: requiredString(body.executionPlanRecordId, 'executionPlanRecordId'),
      executionApprovalRecordId: requiredString(body.executionApprovalRecordId, 'executionApprovalRecordId'),
      plan: planValue(body.plan),
      scope: scopeValue(body.scope),
      issuedBy: stringValue(body.issuedBy) as never,
      approvedBy: stringValue(body.approvedBy) as never,
      correlationId: stringValue(body.correlationId),
      expiresAt: stringValue(body.expiresAt),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
