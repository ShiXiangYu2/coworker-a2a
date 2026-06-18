import { getResourceTimeline } from '@/lib/observability/repository'
import { observabilityErrorResponse } from '@/app/api/observability/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    return Response.json({ ok: true, data: await getResourceTimeline('agent_run', id) })
  } catch (error) {
    return observabilityErrorResponse(error)
  }
}

