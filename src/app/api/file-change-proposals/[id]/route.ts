import { getFileChangeProposal } from '@/lib/file-git-pr/repository'
import { fileGitPrErrorResponse } from '../_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await getFileChangeProposal(id)
    if (!data) return Response.json({ ok: false, error: { code: 'not_found', message: 'FileChangeProposal not found.' } }, { status: 404 })
    return Response.json({ ok: true, data })
  } catch (error) {
    return fileGitPrErrorResponse(error)
  }
}
