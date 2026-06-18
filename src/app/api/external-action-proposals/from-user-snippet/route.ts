import { createExternalActionProposalFromUserSnippet } from '@/lib/external-mcp-governance/repository'
import { externalMcpErrorResponse, externalProposalDefaults, localRecordPayload, readJson } from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = await createExternalActionProposalFromUserSnippet({
      ...externalProposalDefaults(body),
      userSnippet: body.userSnippet,
    })
    return Response.json(localRecordPayload(result), { status: 201 })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
