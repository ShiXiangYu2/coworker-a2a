import {
  numberValue,
  readJson,
  requiredString,
  runRuntimeDispatchJobOnce,
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
    const mode = requiredString(body.mode, 'mode')
    const result = await runRuntimeDispatchJobOnce({
      jobId: id,
      workerId: requiredString(body.workerId, 'workerId'),
      mode: mode as 'dry_run' | 'obsidian_write',
      execute: body.execute === true,
      vaultPath: stringValue(body.vaultPath),
      leaseDurationMs: numberValue(body.leaseDurationMs),
    })
    return Response.json({
      ok: true,
      claim: result.claim.record,
      start: result.start.record,
      data: result.completion.record,
      token: result.completion.token,
      receipt: result.completion.receipt,
      connectorReceipt: 'connectorReceipt' in result.completion ? result.completion.connectorReceipt : undefined,
      recovery: result.completion.recovery,
      auditEvents: [
        result.claim.auditEvent,
        result.start.auditEvent,
        result.completion.auditEvent,
      ],
      safetyNote: result.safetyNote,
    }, { status: 200 })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
