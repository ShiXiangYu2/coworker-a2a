import { cancelToolCall } from '@/lib/tools/repository'
import { toolErrorResponse } from '../../_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await cancelToolCall(id)
    return Response.json({ ok: true, data: data.toolCall, auditEvents: data.auditEvents })
  } catch (error) {
    return toolErrorResponse(error)
  }
}
