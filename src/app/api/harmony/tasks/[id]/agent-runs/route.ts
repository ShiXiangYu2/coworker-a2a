import { listAgentRunsForTask } from '@/lib/agent-runtime/repository'
import { agentRuntimeErrorResponse } from '@/app/api/agent-runtime/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    return Response.json(await listAgentRunsForTask(id))
  } catch (error) {
    return agentRuntimeErrorResponse(error)
  }
}
