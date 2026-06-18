import { listRecoveryPoints } from '@/lib/observability/repository'
import { observabilityErrorResponse } from '@/app/api/observability/_shared'

interface Params {
  params: Promise<{ resourceType: string; resourceId: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { resourceType, resourceId } = await params
    return Response.json({ ok: true, data: await listRecoveryPoints({ resourceType, resourceId }) })
  } catch (error) {
    return observabilityErrorResponse(error)
  }
}

