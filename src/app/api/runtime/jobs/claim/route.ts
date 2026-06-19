import {
  claimRuntimeDispatchJob,
  numberValue,
  readJson,
  requiredString,
  runtimeExecutionErrorResponse,
} from '../../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = await claimRuntimeDispatchJob({
      workerId: requiredString(body.workerId, 'workerId'),
      leaseDurationMs: numberValue(body.leaseDurationMs),
    })
    return Response.json({ ok: true, data: result.record, attempt: result.attempt, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 200 })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
