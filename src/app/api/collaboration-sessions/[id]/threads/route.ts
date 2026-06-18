import { listA2AThreads } from '@/lib/collaboration/repository'
import { collaborationErrorResponse } from '../../../collaboration/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await listA2AThreads({ collaborationSessionId: id })
    return Response.json({ ok: true, data })
  } catch (error) {
    return collaborationErrorResponse(error)
  }
}
