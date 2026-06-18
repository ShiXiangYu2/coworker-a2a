import { getToolCallBundle } from '@/lib/tools/repository'
import { toolErrorResponse } from '../_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await getToolCallBundle(id)
    if (!data) {
      return Response.json(
        { ok: false, error: { code: 'not_found', message: 'ToolCall not found.' } },
        { status: 404 }
      )
    }
    return Response.json({ ok: true, data })
  } catch (error) {
    return toolErrorResponse(error)
  }
}
