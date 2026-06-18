import { reviewMemoryEntry } from '@/lib/memory/repository'
import { memoryErrorResponse, readJson, stringValue } from '../../_shared'

export async function POST(request: Request, ctx: RouteContext<'/api/memory/[id]/supersede'>) {
  try {
    const { id } = await ctx.params
    const body = await readJson(request)
    const data = await reviewMemoryEntry(id, 'SUPERSEDE', {
      reviewedBy: stringValue(body.reviewedBy),
      decisionReason: stringValue(body.decisionReason) ?? '',
    })
    return Response.json({ ok: true, data, auditEvents: [] })
  } catch (error) {
    return memoryErrorResponse(error)
  }
}
