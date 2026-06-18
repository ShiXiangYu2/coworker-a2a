import { reviewMemoryEntry } from '@/lib/memory/repository'
import { memoryErrorResponse, readJson, stringValue } from '../../_shared'

export async function POST(request: Request, ctx: RouteContext<'/api/memory/[id]/archive'>) {
  try {
    const { id } = await ctx.params
    const body = await readJson(request)
    const data = await reviewMemoryEntry(id, 'ARCHIVE', {
      reviewedBy: stringValue(body.reviewedBy),
      decisionReason: stringValue(body.decisionReason) ?? 'Archived locally.',
    })
    return Response.json({ ok: true, data, auditEvents: [] })
  } catch (error) {
    return memoryErrorResponse(error)
  }
}
