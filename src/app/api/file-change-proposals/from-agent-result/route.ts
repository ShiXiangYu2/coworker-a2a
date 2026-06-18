import { createFileChangeProposalFromAgentResult } from '@/lib/file-git-pr/repository'
import { fileGitPrErrorResponse, localRecordPayload, readJson, stringValue, targetFilesValue } from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const agentRunId = stringValue(body.agentRunId)
    if (!agentRunId) throw new Error('agentRunId is required.')
    const result = await createFileChangeProposalFromAgentResult(agentRunId, {
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
