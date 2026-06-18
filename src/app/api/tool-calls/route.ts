import { listToolCalls } from '@/lib/tools/repository'
import { stringValue, toolErrorResponse } from './_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listToolCalls({
      taskId: stringValue(url.searchParams.get('taskId')),
      agentRunId: stringValue(url.searchParams.get('agentRunId')),
      status: stringValue(url.searchParams.get('status')),
    })
    return Response.json({ ok: true, data })
  } catch (error) {
    return toolErrorResponse(error)
  }
}
