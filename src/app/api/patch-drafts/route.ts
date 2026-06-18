import { createPatchDraft, listPatchDrafts } from '@/lib/file-git-pr/repository'
import { fileGitPrErrorResponse, readJson, stringValue } from '../file-change-proposals/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listPatchDrafts({ fileChangeProposalId: url.searchParams.get('fileChangeProposalId') ?? undefined })
    return Response.json({ ok: true, data })
  } catch (error) {
    return fileGitPrErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const fileChangeProposalId = stringValue(body.fileChangeProposalId)
    const targetPath = stringValue(body.targetPath)
    const summary = stringValue(body.summary)
    const rationale = stringValue(body.rationale)
    const proposedPatch = stringValue(body.proposedPatch)
    if (!fileChangeProposalId) throw new Error('fileChangeProposalId is required.')
    if (!targetPath) throw new Error('targetPath is required.')
    if (!summary) throw new Error('summary is required.')
    if (!rationale) throw new Error('rationale is required.')
    if (!proposedPatch) throw new Error('proposedPatch is required.')
    const result = await createPatchDraft({
      fileChangeProposalId,
      draftType: stringValue(body.draftType) as never,
      targetPath,
      language: stringValue(body.language),
      summary,
      rationale,
      proposedPatch,
      sourceSnippet: stringValue(body.sourceSnippet),
      sourceRedactionStatus: stringValue(body.sourceRedactionStatus) as never,
      riskLevel: stringValue(body.riskLevel) as never,
      createdBy: stringValue(body.createdBy) as never,
    })
    return Response.json({ ok: true, data: result.patchDraft, auditEvents: result.auditEvents, observabilityEvents: result.observabilityEvents }, { status: 201 })
  } catch (error) {
    return fileGitPrErrorResponse(error)
  }
}
