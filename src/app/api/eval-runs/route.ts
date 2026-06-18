import { listEvalRuns } from '@/lib/eval/repository'
import { evalErrorResponse } from '@/app/api/eval-targets/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listEvalRuns({
      targetType: url.searchParams.get('targetType') ?? undefined,
      targetId: url.searchParams.get('targetId') ?? undefined,
    })
    return Response.json({ ok: true, data })
  } catch (error) {
    return evalErrorResponse(error)
  }
}
