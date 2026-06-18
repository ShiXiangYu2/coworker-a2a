import { createGitChangePlan, listGitChangePlans } from '@/lib/file-git-pr/repository'
import { fileGitPrErrorResponse, readJson, stringArray, stringValue } from '../file-change-proposals/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listGitChangePlans({ fileChangeProposalId: url.searchParams.get('fileChangeProposalId') ?? undefined })
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
    const rationale = stringValue(body.rationale)
    if (!title) throw new Error('title is required.')
    if (!summary) throw new Error('summary is required.')
    if (!rationale) throw new Error('rationale is required.')
    const result = await createGitChangePlan({
      fileChangeProposalId: stringValue(body.fileChangeProposalId),
      patchDraftIds: stringArray(body.patchDraftIds),
      sourceEvidenceRefs: stringArray(body.sourceEvidenceRefs),
      sourceRedactionStatus: stringValue(body.sourceRedactionStatus) as never,
      planType: stringValue(body.planType) as never,
      title,
      summary,
      rationale,
      proposedBranchName: stringValue(body.proposedBranchName),
      proposedCommitMessage: stringValue(body.proposedCommitMessage),
      proposedChangedPaths: stringArray(body.proposedChangedPaths),
      proposedCommandsText: stringValue(body.proposedCommandsText),
      riskLevel: stringValue(body.riskLevel) as never,
      createdBy: stringValue(body.createdBy) as never,
    })
    return Response.json({ ok: true, data: result.gitChangePlan, auditEvents: result.auditEvents, observabilityEvents: result.observabilityEvents }, { status: 201 })
  } catch (error) {
    return fileGitPrErrorResponse(error)
  }
}
