import { listA2AMessages } from '@/lib/memory/repository'
import { memoryErrorResponse, stringValue } from '../../memory/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listA2AMessages({
      status: stringValue(url.searchParams.get('status')),
      taskId: stringValue(url.searchParams.get('taskId')),
      agentRunId: stringValue(url.searchParams.get('agentRunId')),
      agentId: stringValue(url.searchParams.get('agentId')),
    })
    return Response.json({ ok: true, data })
  } catch (error) {
    return memoryErrorResponse(error)
  }
}
