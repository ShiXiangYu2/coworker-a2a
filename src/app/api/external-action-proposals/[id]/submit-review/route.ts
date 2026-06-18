import { updateExternalActionProposalStatus } from '@/lib/external-mcp-governance/repository'
import { externalMcpErrorResponse, readJson, stringValue } from '../../_shared'

interface Params { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await readJson(request)
    const result = await updateExternalActionProposalStatus(id, 'SUBMIT_REVIEW', stringValue(body.reason) ?? 'Submitted local external proposal for review.')
    return Response.json({ ok: true, data: result.data, auditEvents: result.auditEvents, observabilityEvents: result.observabilityEvents })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
