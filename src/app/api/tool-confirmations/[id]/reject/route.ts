import { rejectToolConfirmation } from '@/lib/tools/repository'
import { readOptionalJson, stringValue, toolErrorResponse } from '../../../tool-calls/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(
  request: Request,
  { params }: Params
) {
  try {
    const { id } = await params
    const body = await readOptionalJson(request)
    const data = await rejectToolConfirmation(id, {
      reviewedBy: stringValue(body.reviewedBy),
      decisionReason: stringValue(body.decisionReason) ?? 'Rejected local ToolCall record.',
    })
    return Response.json({ ok: true, data: data.toolCall, auditEvents: data.auditEvents })
  } catch (error) {
    return toolErrorResponse(error)
  }
}
