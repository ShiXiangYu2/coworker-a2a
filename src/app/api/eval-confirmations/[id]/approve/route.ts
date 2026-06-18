import { approveEvalConfirmation } from '@/lib/eval/repository'
import { evalErrorResponse, readJson, stringValue } from '@/app/api/eval-targets/_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await readJson(request)
    const result = await approveEvalConfirmation(id, {
      reviewedBy: stringValue(body.reviewedBy) ?? 'kelvin',
      decisionReason: stringValue(body.decisionReason) ?? 'Approved local Eval review only.',
    })
    return Response.json({ ok: true, data: result.finding, auditEvents: result.auditEvents })
  } catch (error) {
    return evalErrorResponse(error)
  }
}
