import { getEvalRun } from '@/lib/eval/repository'
import { evalErrorResponse } from '@/app/api/eval-targets/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const run = await getEvalRun(id)
    if (!run) {
      return Response.json(
        { ok: false, error: { code: 'not_found', message: 'EvalRun not found.' } },
        { status: 404 }
      )
    }
    return Response.json({ ok: true, data: run.qualityGateDecision ?? null })
  } catch (error) {
    return evalErrorResponse(error)
  }
}
