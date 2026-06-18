import { cancelTask } from '@/lib/harmony/repository'
import { harmonyErrorResponse } from '../../../_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    return Response.json(await cancelTask(id))
  } catch (error) {
    return harmonyErrorResponse(error)
  }
}
