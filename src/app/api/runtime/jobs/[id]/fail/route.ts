import {
  isObject,
  readJson,
  requireRuntimeWorkerAuth,
  requiredString,
  runtimeExecutionErrorResponse,
  failRuntimeDispatchJob,
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
    const error = isObject(body.error) ? body.error : {}
    const snapshot = isObject(body.snapshot) ? body.snapshot : undefined
    const result = await failRuntimeDispatchJob({
      id,
      workerId,
      error,
      snapshot,
    })
    return Response.json({ ok: true, data: result.record, attempt: result.attempt, recovery: result.recovery, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 200 })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
