import { getObservabilityEvent } from '@/lib/observability/repository'
import { observabilityErrorResponse } from '@/app/api/observability/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await getObservabilityEvent(id)
    if (!data) return Response.json({ ok: false, error: { code: 'not_found', message: 'ObservabilityEvent not found.' } }, { status: 404 })
    return Response.json({ ok: true, data })
  } catch (error) {
    return observabilityErrorResponse(error)
  }
}

