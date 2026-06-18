import { listToolExecutionPlans, listToolExecutionReceipts } from '@/lib/tools/repository'
import { toolErrorResponse } from '../../../../tool-calls/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const [executionPlans, executionReceipts] = await Promise.all([
      listToolExecutionPlans({ agentRunId: id }),
      listToolExecutionReceipts({ agentRunId: id }),
    ])
    return Response.json({ ok: true, data: { executionPlans, executionReceipts } })
  } catch (error) {
    return toolErrorResponse(error)
  }
}
