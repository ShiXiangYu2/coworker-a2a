import { getAgentRun } from '@/lib/agent-runtime/repository'
import { agentRuntimeErrorResponse } from '../../_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const bundle = await getAgentRun(id)

    if (!bundle) {
      return Response.json({ error: 'AgentRun not found.' }, { status: 404 })
    }

    return Response.json(bundle)
  } catch (error) {
    return agentRuntimeErrorResponse(error)
  }
}
