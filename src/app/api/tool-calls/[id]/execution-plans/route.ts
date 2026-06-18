import { listToolExecutionPlans } from '@/lib/tools/repository'
import { toolErrorResponse } from '../../_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await listToolExecutionPlans({ toolCallId: id })
    return Response.json({ ok: true, data })
  } catch (error) {
    return toolErrorResponse(error)
  }
}
