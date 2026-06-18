import { getEvalRunBundle } from '@/lib/eval/repository'
import { evalErrorResponse } from '@/app/api/eval-targets/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await getEvalRunBundle(id)
    if (!data) {
      return Response.json(
        { ok: false, error: { code: 'not_found', message: 'EvalRun not found.' } },
        { status: 404 }
      )
    }
    return Response.json({ ok: true, data })
  } catch (error) {
    return evalErrorResponse(error)
  }
}
