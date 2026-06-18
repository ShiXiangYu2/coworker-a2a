import { getA2ATurn } from '@/lib/collaboration/repository'
import { collaborationErrorResponse } from '../../../collaboration/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await getA2ATurn(id)
    if (!data) return Response.json({ ok: false, error: { code: 'not_found', message: 'A2ATurn not found.' } }, { status: 404 })
    return Response.json({ ok: true, data })
  } catch (error) {
    return collaborationErrorResponse(error)
  }
}
