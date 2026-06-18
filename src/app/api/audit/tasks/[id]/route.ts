import { listAuditEvents } from '@/lib/observability/repository'
import { observabilityErrorResponse } from '@/app/api/observability/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    return Response.json({ ok: true, data: await listAuditEvents({ taskId: id, limit: 200 }) })
  } catch (error) {
    return observabilityErrorResponse(error)
  }
}

