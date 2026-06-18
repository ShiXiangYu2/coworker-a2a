import { createExternalActionProposalFromToolExecutionReceipt } from '@/lib/external-mcp-governance/repository'
import { externalMcpErrorResponse, externalProposalDefaults, localRecordPayload, readJson, stringValue } from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const receiptId = stringValue(body.toolExecutionReceiptId)
    if (!receiptId) throw new Error('toolExecutionReceiptId is required.')
    const result = await createExternalActionProposalFromToolExecutionReceipt(receiptId, externalProposalDefaults(body))
    return Response.json(localRecordPayload(result), { status: 201 })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
