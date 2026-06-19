import {
  completeRuntimeDispatchJobDryRun,
  isObject,
  readJson,
  requiredString,
  runtimeExecutionErrorResponse,
  stringValue,
} from '../../../_shared'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await readJson(request)
    const result = await completeRuntimeDispatchJobDryRun({
      id,
      workerId: requiredString(body.workerId, 'workerId'),
      targetRef: stringValue(body.targetRef),
      summary: stringValue(body.summary),
      result: isObject(body.result) ? body.result : undefined,
      snapshot: isObject(body.snapshot) ? body.snapshot : undefined,
    })
    return Response.json({
      ok: true,
      data: result.record,
      token: result.token,
      receipt: result.receipt,
      recovery: result.recovery,
      auditEvents: [result.auditEvent],
      safetyNote: result.safetyNote,
    }, { status: 200 })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
