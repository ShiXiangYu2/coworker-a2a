import { useResumeToken as consumeResumeToken } from '@/lib/observability/repository'
import { observabilityErrorResponse } from '@/app/api/observability/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await consumeResumeToken(id)
    return Response.json({ ok: true, data, observabilityEvents: data.observabilityEvents })
  } catch (error) {
    return observabilityErrorResponse(error)
  }
}
