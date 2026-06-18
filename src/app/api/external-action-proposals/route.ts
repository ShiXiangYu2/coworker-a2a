import {
  createExternalActionProposal,
  listExternalActionProposals,
} from '@/lib/external-mcp-governance/repository'
import { externalMcpErrorResponse, localRecordPayload, readJson, stringArray, stringValue } from './_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listExternalActionProposals({
      taskId: url.searchParams.get('taskId') ?? undefined,
      agentRunId: url.searchParams.get('agentRunId') ?? undefined,
      toolRunId: url.searchParams.get('toolRunId') ?? undefined,
      toolExecutionReceiptId: url.searchParams.get('toolExecutionReceiptId') ?? undefined,
      collaborationDecisionId: url.searchParams.get('collaborationDecisionId') ?? undefined,
      fileChangeProposalId: url.searchParams.get('fileChangeProposalId') ?? undefined,
      pullRequestPlanId: url.searchParams.get('pullRequestPlanId') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
    })
    return Response.json({ ok: true, data })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const sourceKind = stringValue(body.sourceKind)
    const title = stringValue(body.title)
    const summary = stringValue(body.summary)
    const proposedIntent = stringValue(body.proposedIntent)
    if (!sourceKind) throw new Error('sourceKind is required.')
    if (!title) throw new Error('title is required.')
    if (!summary) throw new Error('summary is required.')
    if (!proposedIntent) throw new Error('proposedIntent is required.')
    const result = await createExternalActionProposal({
      sourceKind: sourceKind as never,
      sourceEvidenceRefs: stringArray(body.sourceEvidenceRefs),
      sourceSnapshot: body.sourceSnapshot,
      sourceRedactionStatus: stringValue(body.sourceRedactionStatus) as never,
      taskId: stringValue(body.taskId),
      agentRunId: stringValue(body.agentRunId),
      toolRunId: stringValue(body.toolRunId),
      toolExecutionReceiptId: stringValue(body.toolExecutionReceiptId),
      collaborationDecisionId: stringValue(body.collaborationDecisionId),
      fileChangeProposalId: stringValue(body.fileChangeProposalId),
      pullRequestPlanId: stringValue(body.pullRequestPlanId),
      externalIntegrationProfileId: stringValue(body.externalIntegrationProfileId),
      mcpConnectionProfileId: stringValue(body.mcpConnectionProfileId),
      actionCategory: stringValue(body.actionCategory) as never,
      title,
      summary,
      proposedIntent,
      proposedPayloadSummary: stringValue(body.proposedPayloadSummary),
      endpointMetadataRef: stringValue(body.endpointMetadataRef),
      dataClassification: stringValue(body.dataClassification) as never,
      riskLevel: stringValue(body.riskLevel) as never,
      createdBy: stringValue(body.createdBy) as never,
    })
    return Response.json(localRecordPayload(result), { status: 201 })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
