import {
  completeRuntimeDispatchJobObsidianWrite,
  isObject,
  readJson,
  requireRuntimeWorkerAuth,
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
    const workerId = requiredString(body.workerId, 'workerId')
    requireRuntimeWorkerAuth(request, workerId)
    const result = await completeRuntimeDispatchJobObsidianWrite({
      id,
      workerId,
      execute: body.execute === true,
      vaultPath: stringValue(body.vaultPath),
      snapshot: isObject(body.snapshot) ? body.snapshot : undefined,
    })
    return Response.json({
      ok: true,
      data: result.record,
      token: result.token,
      receipt: result.receipt,
      connectorReceipt: result.connectorReceipt,
      recovery: result.recovery,
      auditEvents: [result.auditEvent],
      safetyNote: result.safetyNote,
    }, { status: 200 })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
