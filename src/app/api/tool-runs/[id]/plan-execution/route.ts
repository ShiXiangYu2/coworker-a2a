import { planToolExecutionFromToolRunOrCall } from '@/lib/tools/repository'
import { toolErrorResponse } from '../../../tool-calls/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await planToolExecutionFromToolRunOrCall(id)
    return Response.json({
      ok: true,
      data,
      auditEvents: data.auditEvents,
      observabilityEvents: data.observabilityEvents,
    })
  } catch (error) {
    return toolErrorResponse(error)
  }
}
