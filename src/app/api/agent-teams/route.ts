import { listAgentTeams } from '@/lib/collaboration/repository'

export async function GET() {
  return Response.json({ ok: true, data: listAgentTeams() })
}
