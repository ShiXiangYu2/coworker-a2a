import { getKnowledgeItem } from '@/lib/memory/repository'
import { memoryErrorResponse } from '../../memory/_shared'

export async function GET(_request: Request, ctx: RouteContext<'/api/knowledge/[id]'>) {
  try {
    const { id } = await ctx.params
    const data = await getKnowledgeItem(id)
    if (!data) return Response.json({ ok: false, error: { code: 'not_found', message: 'KnowledgeItem not found.' } }, { status: 404 })
    return Response.json({ ok: true, data })
  } catch (error) {
    return memoryErrorResponse(error)
  }
}
