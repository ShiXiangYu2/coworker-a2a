import { listContextPacketsForAgentRun } from '@/lib/memory/repository'
import { memoryErrorResponse } from '@/app/api/memory/_shared'

export async function GET(_request: Request, ctx: RouteContext<'/api/agent-runtime/runs/[id]/context-packets'>) {
  try {
    const { id } = await ctx.params
    const packets = await listContextPacketsForAgentRun(id)
    return Response.json({ ok: true, data: packets })
  } catch (error) {
    return memoryErrorResponse(error)
  }
}
