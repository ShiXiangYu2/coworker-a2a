import { getToolRun } from '@/lib/tools/repository'
import { toolErrorResponse } from '../../tool-calls/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await getToolRun(id)
    if (!data) {
      return Response.json(
        { ok: false, error: { code: 'not_found', message: 'ToolRun not found.' } },
        { status: 404 }
      )
    }
    return Response.json({ ok: true, data })
  } catch (error) {
    return toolErrorResponse(error)
  }
}
