import { getStaticAgentTeam } from '@/lib/collaboration/repository'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const data = getStaticAgentTeam(id)
  if (!data) {
    return Response.json(
      { ok: false, error: { code: 'not_found', message: 'AgentTeam not found.' } },
      { status: 404 }
    )
  }
  return Response.json({ ok: true, data })
}
