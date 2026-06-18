import { rejectToolExecutionPlan } from '@/lib/tools/repository'
import { readOptionalJson, stringValue, toolErrorResponse } from '../../../tool-calls/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await readOptionalJson(request)
    const data = await rejectToolExecutionPlan(id, {
      reviewedBy: stringValue(body.reviewedBy) ?? 'kelvin',
      decisionReason: stringValue(body.decisionReason) ?? 'Rejected ToolExecutionPlan.',
    })
    return Response.json({ ok: true, data, auditEvents: data.auditEvents })
  } catch (error) {
    return toolErrorResponse(error)
  }
}
