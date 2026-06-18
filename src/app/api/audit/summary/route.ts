import { getAuditSummary } from '@/lib/observability/repository'
import { observabilityErrorResponse } from '@/app/api/observability/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    return Response.json({ ok: true, data: await getAuditSummary({ correlationId: url.searchParams.get('correlationId') ?? undefined }) })
  } catch (error) {
    return observabilityErrorResponse(error)
  }
}

