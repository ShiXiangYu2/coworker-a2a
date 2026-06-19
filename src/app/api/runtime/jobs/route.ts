import {
  actionParam,
  connectorParam,
  createRuntimeDispatchJob,
  limitParam,
  listRuntimeDispatchJobs,
  numberValue,
  planValue,
  readJson,
  requiredString,
  runtimeExecutionErrorResponse,
  statusParam,
  stringValue,
} from '../_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listRuntimeDispatchJobs({
      status: statusParam(url.searchParams.get('status')),
      taskId: stringValue(url.searchParams.get('taskId')),
      runtimeTokenId: stringValue(url.searchParams.get('runtimeTokenId')),
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
    const result = await createRuntimeDispatchJob({
      runtimeTokenId: requiredString(body.runtimeTokenId, 'runtimeTokenId'),
      taskId: requiredString(body.taskId, 'taskId'),
      plan: planValue(body.plan),
      correlationId: stringValue(body.correlationId),
      priority: numberValue(body.priority),
      scheduledAt: stringValue(body.scheduledAt),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
