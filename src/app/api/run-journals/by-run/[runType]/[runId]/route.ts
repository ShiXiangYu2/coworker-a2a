import { listRunJournals } from '@/lib/observability/repository'
import { observabilityErrorResponse } from '@/app/api/observability/_shared'

interface Params {
  params: Promise<{ runType: string; runId: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { runType, runId } = await params
    return Response.json({ ok: true, data: await listRunJournals({ runType, runId }) })
  } catch (error) {
    return observabilityErrorResponse(error)
  }
}

