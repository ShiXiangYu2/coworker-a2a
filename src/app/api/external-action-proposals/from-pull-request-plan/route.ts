import { createExternalActionProposalFromPullRequestPlan } from '@/lib/external-mcp-governance/repository'
import { externalMcpErrorResponse, externalProposalDefaults, localRecordPayload, readJson, stringValue } from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const pullRequestPlanId = stringValue(body.pullRequestPlanId)
    if (!pullRequestPlanId) throw new Error('pullRequestPlanId is required.')
    const result = await createExternalActionProposalFromPullRequestPlan(pullRequestPlanId, externalProposalDefaults(body))
    return Response.json(localRecordPayload(result), { status: 201 })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
