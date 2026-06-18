import { listCollaborationSessions } from '@/lib/collaboration/repository'
import { collaborationErrorResponse } from '../collaboration/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listCollaborationSessions({
      taskId: url.searchParams.get('taskId') ?? undefined,
      sourceAgentRunId: url.searchParams.get('sourceAgentRunId') ?? undefined,
      sourceA2AMessageId: url.searchParams.get('sourceA2AMessageId') ?? undefined,
      sourceEvalRunId: url.searchParams.get('sourceEvalRunId') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
    })
    return Response.json({ ok: true, data })
  } catch (error) {
    return collaborationErrorResponse(error)
  }
}
