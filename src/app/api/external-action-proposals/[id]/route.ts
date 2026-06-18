import { getExternalActionProposal } from '@/lib/external-mcp-governance/repository'
import { externalMcpErrorResponse } from '../_shared'

interface Params { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await getExternalActionProposal(id)
    if (!data) return Response.json({ ok: false, error: { code: 'not_found', message: 'ExternalActionProposal not found.' } }, { status: 404 })
    return Response.json({ ok: true, data })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
