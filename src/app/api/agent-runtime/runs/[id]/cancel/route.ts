import { cancelAgentRun } from '@/lib/agent-runtime/repository'
import { agentRuntimeErrorResponse } from '../../../_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    return Response.json(await cancelAgentRun(id))
  } catch (error) {
    return agentRuntimeErrorResponse(error)
  }
}
