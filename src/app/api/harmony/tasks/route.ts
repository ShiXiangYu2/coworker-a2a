import { listTasks } from '@/lib/harmony/repository'
import { harmonyErrorResponse } from '../_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const tasks = await listTasks({
      conversationId: url.searchParams.get('conversationId') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      agentId: url.searchParams.get('agentId') ?? undefined,
    })

    return Response.json(tasks)
  } catch (error) {
    return harmonyErrorResponse(error)
  }
}
