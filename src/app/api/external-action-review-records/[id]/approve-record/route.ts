import { updateExternalActionReviewRecordStatus } from '@/lib/external-mcp-governance/repository'
import { externalMcpErrorResponse, readJson, stringValue } from '@/app/api/external-action-proposals/_shared'

interface Params { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await readJson(request)
    const result = await updateExternalActionReviewRecordStatus(id, 'APPROVE_RECORD', stringValue(body.reason) ?? 'Approved local external review record.')
    return Response.json({ ok: true, data: result.externalActionReviewRecord, auditEvents: result.auditEvents, observabilityEvents: result.observabilityEvents })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
