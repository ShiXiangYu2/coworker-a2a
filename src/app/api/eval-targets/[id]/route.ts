import { getEvalTarget } from '@/lib/eval/repository'
import { evalErrorResponse } from '../_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await getEvalTarget(id)
    if (!data) {
      return Response.json(
        { ok: false, error: { code: 'not_found', message: 'EvalTarget not found.' } },
        { status: 404 }
      )
    }
    return Response.json({ ok: true, data })
  } catch (error) {
    return evalErrorResponse(error)
  }
}
