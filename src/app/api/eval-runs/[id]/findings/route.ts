import { listEvalFindings } from '@/lib/eval/repository'
import { evalErrorResponse } from '@/app/api/eval-targets/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await listEvalFindings(id)
    return Response.json({ ok: true, data })
  } catch (error) {
    return evalErrorResponse(error)
  }
}
