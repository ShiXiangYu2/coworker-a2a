import { listFailures } from '@/lib/observability/repository'
import { observabilityErrorResponse } from '@/app/api/observability/_shared'

interface Params {
  params: Promise<{ correlationId: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { correlationId } = await params
    return Response.json({ ok: true, data: await listFailures({ correlationId }) })
  } catch (error) {
    return observabilityErrorResponse(error)
  }
}

