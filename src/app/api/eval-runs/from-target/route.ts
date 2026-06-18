import { createEvalRunFromTarget } from '@/lib/eval/repository'
import { evalErrorResponse, readJson, stringValue } from '@/app/api/eval-targets/_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const evalTargetId = stringValue(body.evalTargetId)
    if (!evalTargetId) throw new Error('evalTargetId is required.')

    const result = await createEvalRunFromTarget({
      evalTargetId,
      trigger: 'api',
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json(
      { ok: true, data: result.bundle, auditEvents: result.auditEvents },
      { status: 201 }
    )
  } catch (error) {
    return evalErrorResponse(error)
  }
}
