import { createExternalActionProposalFromFileChangeProposal } from '@/lib/external-mcp-governance/repository'
import { externalMcpErrorResponse, externalProposalDefaults, localRecordPayload, readJson, stringValue } from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const fileChangeProposalId = stringValue(body.fileChangeProposalId)
    if (!fileChangeProposalId) throw new Error('fileChangeProposalId is required.')
    const result = await createExternalActionProposalFromFileChangeProposal(fileChangeProposalId, externalProposalDefaults(body))
    return Response.json(localRecordPayload(result), { status: 201 })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
