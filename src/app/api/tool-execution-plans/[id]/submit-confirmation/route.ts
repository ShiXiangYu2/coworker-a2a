import { submitToolExecutionConfirmation } from '@/lib/tools/repository'
import { readOptionalJson, stringValue, toolErrorResponse } from '../../../tool-calls/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await readOptionalJson(request)
    const data = await submitToolExecutionConfirmation(id, {
      reviewedBy: stringValue(body.reviewedBy) ?? 'kelvin',
      decisionReason:
        stringValue(body.decisionReason) ??
        'Kelvin approved this local ToolExecutionPlan confirmation record only.',
    })
    return Response.json({ ok: true, data, auditEvents: data.auditEvents })
  } catch (error) {
    return toolErrorResponse(error)
  }
}
