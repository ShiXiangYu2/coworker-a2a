import { updatePatchDraftStatus } from '@/lib/file-git-pr/repository'
import { fileGitPrErrorResponse, readJson, stringValue } from '@/app/api/file-change-proposals/_shared'

interface Params { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await readJson(request)
    const result = await updatePatchDraftStatus(id, 'APPROVE_RECORD', stringValue(body.reason) ?? 'Approved PatchDraft local record.')
    return Response.json({ ok: true, data: result.patchDraft, auditEvents: result.auditEvents, observabilityEvents: result.observabilityEvents })
  } catch (error) { return fileGitPrErrorResponse(error) }
}
