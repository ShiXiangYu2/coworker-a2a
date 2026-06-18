import { createExternalActionProposalFromToolResult } from '@/lib/external-mcp-governance/repository'
import { externalMcpErrorResponse, externalProposalDefaults, localRecordPayload, readJson, stringValue } from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const toolRunId = stringValue(body.toolRunId)
    if (!toolRunId) throw new Error('toolRunId is required.')
    const result = await createExternalActionProposalFromToolResult(toolRunId, externalProposalDefaults(body))
    return Response.json(localRecordPayload(result), { status: 201 })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
