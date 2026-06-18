import { createFileChangeProposalFromToolExecutionReceipt } from '@/lib/file-git-pr/repository'
import { fileGitPrErrorResponse, localRecordPayload, readJson, stringValue, targetFilesValue } from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const receiptId = stringValue(body.toolExecutionReceiptId) ?? stringValue(body.receiptId)
    if (!receiptId) throw new Error('toolExecutionReceiptId is required.')
    const result = await createFileChangeProposalFromToolExecutionReceipt(receiptId, {
      title: stringValue(body.title),
      summary: stringValue(body.summary),
      rationale: stringValue(body.rationale),
      targetFiles: targetFilesValue(body.targetFiles),
      proposedChangeKind: stringValue(body.proposedChangeKind) as never,
      riskLevel: stringValue(body.riskLevel) as never,
      idempotencyKey: stringValue(body.idempotencyKey),
      createdBy: stringValue(body.createdBy) as never,
    })
    return Response.json(localRecordPayload(result), { status: 201 })
  } catch (error) {
    return fileGitPrErrorResponse(error)
  }
}
