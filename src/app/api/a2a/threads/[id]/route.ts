import { getA2AThread } from '@/lib/collaboration/repository'
import { collaborationErrorResponse } from '../../../collaboration/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await getA2AThread(id)
    if (!data) return Response.json({ ok: false, error: { code: 'not_found', message: 'A2AThread not found.' } }, { status: 404 })
    return Response.json({ ok: true, data })
  } catch (error) {
    return collaborationErrorResponse(error)
  }
}
