import { createExternalActionProposalFromAgentResult } from '@/lib/external-mcp-governance/repository'
import { externalMcpErrorResponse, externalProposalDefaults, localRecordPayload, readJson, stringValue } from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const agentRunId = stringValue(body.agentRunId)
    if (!agentRunId) throw new Error('agentRunId is required.')
    const result = await createExternalActionProposalFromAgentResult(agentRunId, externalProposalDefaults(body))
    return Response.json(localRecordPayload(result), { status: 201 })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
