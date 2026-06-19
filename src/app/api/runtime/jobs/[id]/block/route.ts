import {
  isObject,
  readJson,
  requireRuntimeWorkerAuth,
  requiredString,
  runtimeExecutionErrorResponse,
  blockRuntimeDispatchJob,
} from '../../../_shared'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await readJson(request)
    const workerId = requiredString(body.workerId, 'workerId')
    requireRuntimeWorkerAuth(request, workerId)
    const snapshot = isObject(body.snapshot) ? body.snapshot : undefined
    const result = await blockRuntimeDispatchJob({
      id,
      workerId,
      reason: requiredString(body.reason, 'reason'),
      snapshot,
    })
    return Response.json({ ok: true, data: result.record, attempt: result.attempt, recovery: result.recovery, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 200 })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
