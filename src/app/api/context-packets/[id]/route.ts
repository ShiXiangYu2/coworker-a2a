import { getContextPacket } from '@/lib/memory/repository'
import { memoryErrorResponse } from '../../memory/_shared'

export async function GET(_request: Request, ctx: RouteContext<'/api/context-packets/[id]'>) {
  try {
    const { id } = await ctx.params
    const packet = await getContextPacket(id)
    if (!packet) return Response.json({ ok: false, error: { code: 'not_found', message: 'ContextPacket not found.' } }, { status: 404 })
    return Response.json({ ok: true, data: packet })
  } catch (error) {
    return memoryErrorResponse(error)
  }
}
