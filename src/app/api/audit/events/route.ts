import { listAuditEvents } from '@/lib/observability/repository'
import { numberValue, observabilityErrorResponse } from '@/app/api/observability/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listAuditEvents({
      correlationId: url.searchParams.get('correlationId') ?? undefined,
      taskId: url.searchParams.get('taskId') ?? undefined,
      eventType: url.searchParams.get('eventType') ?? undefined,
      limit: numberValue(url.searchParams.get('limit')),
    })
    return Response.json({ ok: true, data })
  } catch (error) {
    return observabilityErrorResponse(error)
  }
}

