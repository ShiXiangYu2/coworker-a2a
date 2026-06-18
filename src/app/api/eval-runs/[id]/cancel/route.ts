import { cancelEvalRun } from '@/lib/eval/repository'
import { evalErrorResponse } from '@/app/api/eval-targets/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const result = await cancelEvalRun(id)
    return Response.json({ ok: true, data: result.evalRun, auditEvents: result.auditEvents })
  } catch (error) {
    return evalErrorResponse(error)
  }
}
