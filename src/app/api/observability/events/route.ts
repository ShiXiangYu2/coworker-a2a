import { listObservabilityEvents } from '@/lib/observability/repository'
import { numberValue, observabilityErrorResponse } from '@/app/api/observability/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listObservabilityEvents({
      correlationId: url.searchParams.get('correlationId') ?? undefined,
      resourceType: url.searchParams.get('resourceType') ?? undefined,
      resourceId: url.searchParams.get('resourceId') ?? undefined,
      limit: numberValue(url.searchParams.get('limit')),
    })
    return Response.json({ ok: true, data })
  } catch (error) {
    return observabilityErrorResponse(error)
  }
}

