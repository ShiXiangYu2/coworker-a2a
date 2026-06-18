import { listToolCalls } from '@/lib/tools/repository'
import { toolErrorResponse } from '../../../../tool-calls/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(
  _request: Request,
  { params }: Params
) {
  try {
    const { id } = await params
    const data = await listToolCalls({ agentRunId: id })
    return Response.json({ ok: true, data })
  } catch (error) {
    return toolErrorResponse(error)
  }
}
