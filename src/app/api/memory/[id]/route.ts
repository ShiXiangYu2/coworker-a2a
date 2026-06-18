import { getMemoryEntry } from '@/lib/memory/repository'
import { memoryErrorResponse } from '../_shared'

export async function GET(_request: Request, ctx: RouteContext<'/api/memory/[id]'>) {
  try {
    const { id } = await ctx.params
    const data = await getMemoryEntry(id)
    if (!data) return Response.json({ ok: false, error: { code: 'not_found', message: 'MemoryEntry not found.' } }, { status: 404 })
    return Response.json({ ok: true, data })
  } catch (error) {
    return memoryErrorResponse(error)
  }
}
