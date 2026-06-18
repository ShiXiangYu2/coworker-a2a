import { getTaskBundle } from '@/lib/harmony/repository'
import { harmonyErrorResponse } from '../../_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const bundle = await getTaskBundle(id)

    if (!bundle) {
      return Response.json({ error: 'Task not found.' }, { status: 404 })
    }

    return Response.json(bundle)
  } catch (error) {
    return harmonyErrorResponse(error)
  }
}
