import { updateHandoffRequestStatus } from '@/lib/collaboration/repository'
import { collaborationErrorResponse, readOptionalJson, stringValue } from '../../../collaboration/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await readOptionalJson(request)
    const result = await updateHandoffRequestStatus(id, 'REJECT', stringValue(body.decisionReason) ?? 'HandoffRequest rejected as a local record.')
    return Response.json({ ok: true, data: result.handoffRequest, auditEvents: result.auditEvents, observabilityEvents: result.observabilityEvents })
  } catch (error) {
    return collaborationErrorResponse(error)
  }
}
