import { listCollaborationSessions } from '@/lib/collaboration/repository'
import { collaborationErrorResponse } from '../../../../collaboration/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await listCollaborationSessions({ sourceAgentRunId: id })
    return Response.json({ ok: true, data })
  } catch (error) {
    return collaborationErrorResponse(error)
  }
}
