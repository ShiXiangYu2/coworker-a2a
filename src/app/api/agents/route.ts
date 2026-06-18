import { getAgents } from '@/lib/agents/registry'

export async function GET() {
  return Response.json({ agents: getAgents() })
}
