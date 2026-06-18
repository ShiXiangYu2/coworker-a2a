import { cancelToolExecution } from '@/lib/tools/repository'
import { toolErrorResponse } from '../../../tool-calls/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await cancelToolExecution(id)
    return Response.json({ ok: true, data, auditEvents: data.auditEvents })
  } catch (error) {
    return toolErrorResponse(error)
  }
}
