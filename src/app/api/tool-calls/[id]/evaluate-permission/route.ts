import { evaluatePermissionForToolCall } from '@/lib/tools/repository'
import { toolErrorResponse } from '../../_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(
  _request: Request,
  { params }: Params
) {
  try {
    const { id } = await params
    const data = await evaluatePermissionForToolCall(id)
    return Response.json({
      ok: true,
      data: { toolCall: data.toolCall, latestPermission: data.latestPermission },
      auditEvents: data.auditEvents,
    })
  } catch (error) {
    return toolErrorResponse(error)
  }
}
