import { reviewKnowledgeItem } from '@/lib/memory/repository'
import { memoryErrorResponse, readJson, stringValue } from '../../../memory/_shared'

export async function POST(request: Request, ctx: RouteContext<'/api/knowledge/[id]/supersede'>) {
  try {
    const { id } = await ctx.params
    const body = await readJson(request)
    const data = await reviewKnowledgeItem(id, 'SUPERSEDE', {
      reviewedBy: stringValue(body.reviewedBy),
      decisionReason: stringValue(body.decisionReason) ?? '',
    })
    return Response.json({ ok: true, data, auditEvents: [] })
  } catch (error) {
    return memoryErrorResponse(error)
  }
}
