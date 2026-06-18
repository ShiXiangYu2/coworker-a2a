import {
  createFileChangeProposal,
  listFileChangeProposals,
} from '@/lib/file-git-pr/repository'
import {
  fileGitPrErrorResponse,
  localRecordPayload,
  readJson,
  stringArray,
  stringValue,
  targetFilesValue,
} from './_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listFileChangeProposals({
      taskId: url.searchParams.get('taskId') ?? undefined,
      agentRunId: url.searchParams.get('agentRunId') ?? undefined,
      toolRunId: url.searchParams.get('toolRunId') ?? undefined,
      toolExecutionReceiptId: url.searchParams.get('toolExecutionReceiptId') ?? undefined,
      collaborationDecisionId: url.searchParams.get('collaborationDecisionId') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
    })
    return Response.json({ ok: true, data })
  } catch (error) {
    return fileGitPrErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const sourceType = stringValue(body.sourceType)
    const title = stringValue(body.title)
    const summary = stringValue(body.summary)
    const rationale = stringValue(body.rationale)
    const targetFiles = targetFilesValue(body.targetFiles)
    if (!sourceType) throw new Error('sourceType is required.')
    if (!title) throw new Error('title is required.')
    if (!summary) throw new Error('summary is required.')
    if (!rationale) throw new Error('rationale is required.')
    if (!targetFiles?.length) throw new Error('targetFiles are required.')
    const result = await createFileChangeProposal({
      sourceType: sourceType as never,
      sourceId: stringValue(body.sourceId),
      sourceEvidenceRefs: stringArray(body.sourceEvidenceRefs),
      sourceSnapshot: body.sourceSnapshot,
      sourceRedactionStatus: stringValue(body.sourceRedactionStatus) as never,
      taskId: stringValue(body.taskId),
      agentRunId: stringValue(body.agentRunId),
      agentResultId: stringValue(body.agentResultId),
      toolRunId: stringValue(body.toolRunId),
      toolResultId: stringValue(body.toolResultId),
      toolExecutionReceiptId: stringValue(body.toolExecutionReceiptId),
      collaborationDecisionId: stringValue(body.collaborationDecisionId),
      title,
      summary,
      rationale,
      targetFiles,
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
