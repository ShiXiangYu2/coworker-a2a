import { listExternalActionProposals } from '@/lib/external-mcp-governance/repository'
import { externalMcpErrorResponse } from '@/app/api/external-action-proposals/_shared'

interface Params { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    return Response.json({ ok: true, data: await listExternalActionProposals({ toolExecutionReceiptId: id }) })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
