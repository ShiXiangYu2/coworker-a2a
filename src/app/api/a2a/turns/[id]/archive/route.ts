import { updateA2ATurnStatus } from '@/lib/collaboration/repository'
import { collaborationErrorResponse, readOptionalJson, stringValue } from '../../../../collaboration/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await readOptionalJson(request)
    const result = await updateA2ATurnStatus(id, 'ARCHIVE', stringValue(body.reason) ?? 'A2ATurn archived as a local record.')
    return Response.json({ ok: true, data: result.a2aTurn, auditEvents: result.auditEvents, observabilityEvents: result.observabilityEvents })
  } catch (error) {
    return collaborationErrorResponse(error)
  }
}
