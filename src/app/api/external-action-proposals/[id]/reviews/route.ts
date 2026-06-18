import { listExternalActionReviewRecords } from '@/lib/external-mcp-governance/repository'
import { externalMcpErrorResponse } from '../../_shared'

interface Params { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    return Response.json({ ok: true, data: await listExternalActionReviewRecords({ externalActionProposalId: id }) })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
