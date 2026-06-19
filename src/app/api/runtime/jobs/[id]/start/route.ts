import {
  readJson,
  requireRuntimeWorkerAuth,
  requiredString,
  runtimeExecutionErrorResponse,
  startRuntimeDispatchJob,
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
    const result = await startRuntimeDispatchJob({
      id,
      workerId,
    })
    return Response.json({ ok: true, data: result.record, attempt: result.attempt, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 200 })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
