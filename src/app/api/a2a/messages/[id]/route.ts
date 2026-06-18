import { getA2AMessage } from '@/lib/memory/repository'
import { memoryErrorResponse } from '../../../memory/_shared'

export async function GET(_request: Request, ctx: RouteContext<'/api/a2a/messages/[id]'>) {
  try {
    const { id } = await ctx.params
    const data = await getA2AMessage(id)
    if (!data) return Response.json({ ok: false, error: { code: 'not_found', message: 'A2AMessage not found.' } }, { status: 404 })
    return Response.json({ ok: true, data })
  } catch (error) {
    return memoryErrorResponse(error)
  }
}
