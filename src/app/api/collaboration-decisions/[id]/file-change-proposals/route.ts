import { listFileChangeProposals } from '@/lib/file-git-pr/repository'
import { fileGitPrErrorResponse } from '@/app/api/file-change-proposals/_shared'

interface Params { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    return Response.json({ ok: true, data: await listFileChangeProposals({ collaborationDecisionId: id }) })
  } catch (error) { return fileGitPrErrorResponse(error) }
}
