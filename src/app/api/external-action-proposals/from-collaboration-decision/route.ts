import { createExternalActionProposalFromCollaborationDecision } from '@/lib/external-mcp-governance/repository'
import { externalMcpErrorResponse, externalProposalDefaults, localRecordPayload, readJson, stringValue } from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const collaborationDecisionId = stringValue(body.collaborationDecisionId)
    if (!collaborationDecisionId) throw new Error('collaborationDecisionId is required.')
    const result = await createExternalActionProposalFromCollaborationDecision(collaborationDecisionId, externalProposalDefaults(body))
    return Response.json(localRecordPayload(result), { status: 201 })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
