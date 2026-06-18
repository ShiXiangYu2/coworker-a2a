import { listRunJournals } from '@/lib/observability/repository'
import { observabilityErrorResponse } from '@/app/api/observability/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listRunJournals({
      runType: url.searchParams.get('runType') ?? undefined,
      runId: url.searchParams.get('runId') ?? undefined,
      correlationId: url.searchParams.get('correlationId') ?? undefined,
    })
    return Response.json({ ok: true, data })
  } catch (error) {
    return observabilityErrorResponse(error)
  }
}

