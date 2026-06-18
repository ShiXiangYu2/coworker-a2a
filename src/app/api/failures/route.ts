import { listFailures } from '@/lib/observability/repository'
import { observabilityErrorResponse } from '@/app/api/observability/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listFailures({
      correlationId: url.searchParams.get('correlationId') ?? undefined,
      resourceType: url.searchParams.get('resourceType') ?? undefined,
      resourceId: url.searchParams.get('resourceId') ?? undefined,
    })
    return Response.json({ ok: true, data })
  } catch (error) {
    return observabilityErrorResponse(error)
  }
}

