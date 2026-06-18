import { createExternalActionReviewRecord, listExternalActionReviewRecords } from '@/lib/external-mcp-governance/repository'
import { externalMcpErrorResponse, readJson, stringArray, stringValue } from '@/app/api/external-action-proposals/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    return Response.json({ ok: true, data: await listExternalActionReviewRecords({ externalActionProposalId: url.searchParams.get('externalActionProposalId') ?? undefined }) })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const externalActionProposalId = stringValue(body.externalActionProposalId)
    const rationale = stringValue(body.rationale)
    if (!externalActionProposalId || !rationale) throw new Error('externalActionProposalId and rationale are required.')
    const result = await createExternalActionReviewRecord({
      externalActionProposalId,
      riskAssessmentId: stringValue(body.riskAssessmentId),
      reviewer: stringValue(body.reviewer) as never,
      verdict: stringValue(body.verdict) as never,
      rationale,
      requiredFollowUps: stringArray(body.requiredFollowUps),
      evidenceRefs: stringArray(body.evidenceRefs),
    })
    return Response.json({ ok: true, data: result.externalActionReviewRecord, auditEvents: result.auditEvents, observabilityEvents: result.observabilityEvents }, { status: 201 })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
