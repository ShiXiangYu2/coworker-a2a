import { approveToolConfirmation } from '@/lib/tools/repository'
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
    const data = await approveToolConfirmation(id, {
      reviewedBy: stringValue(body.reviewedBy),
      decisionReason: stringValue(body.decisionReason) ?? 'Approved local ToolCall record only.',
    })
    return Response.json({ ok: true, data: data.toolCall, auditEvents: data.auditEvents })
  } catch (error) {
    return toolErrorResponse(error)
  }
}
