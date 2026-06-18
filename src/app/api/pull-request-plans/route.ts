import { createPullRequestPlan, listPullRequestPlans } from '@/lib/file-git-pr/repository'
import { fileGitPrErrorResponse, readJson, stringArray, stringValue } from '../file-change-proposals/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listPullRequestPlans({
      fileChangeProposalId: url.searchParams.get('fileChangeProposalId') ?? undefined,
      gitChangePlanId: url.searchParams.get('gitChangePlanId') ?? undefined,
    })
    return Response.json({ ok: true, data })
  } catch (error) {
    return fileGitPrErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const title = stringValue(body.title)
    const summary = stringValue(body.summary)
    const bodyDraft = stringValue(body.bodyDraft)
    if (!title) throw new Error('title is required.')
    if (!summary) throw new Error('summary is required.')
    if (!bodyDraft) throw new Error('bodyDraft is required.')
    const result = await createPullRequestPlan({
      fileChangeProposalId: stringValue(body.fileChangeProposalId),
      gitChangePlanId: stringValue(body.gitChangePlanId),
      patchDraftIds: stringArray(body.patchDraftIds),
      sourceEvidenceRefs: stringArray(body.sourceEvidenceRefs),
      sourceRedactionStatus: stringValue(body.sourceRedactionStatus) as never,
      title,
      summary,
      bodyDraft,
      checklist: stringArray(body.checklist),
      riskNotes: stringArray(body.riskNotes),
      testPlan: stringArray(body.testPlan),
      reviewerNotes: stringArray(body.reviewerNotes),
      riskLevel: stringValue(body.riskLevel) as never,
      createdBy: stringValue(body.createdBy) as never,
    })
    return Response.json({ ok: true, data: result.pullRequestPlan, auditEvents: result.auditEvents, observabilityEvents: result.observabilityEvents }, { status: 201 })
  } catch (error) {
    return fileGitPrErrorResponse(error)
  }
}
