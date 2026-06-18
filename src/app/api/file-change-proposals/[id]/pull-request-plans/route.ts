import { listPullRequestPlans } from '@/lib/file-git-pr/repository'
import { fileGitPrErrorResponse } from '../../_shared'

interface Params { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    return Response.json({ ok: true, data: await listPullRequestPlans({ fileChangeProposalId: id }) })
  } catch (error) { return fileGitPrErrorResponse(error) }
}
