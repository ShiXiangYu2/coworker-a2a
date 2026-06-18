import { getMcpConnectionProfile } from '@/lib/external-mcp-governance/repository'
import { externalMcpErrorResponse } from '@/app/api/external-action-proposals/_shared'

interface Params { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const data = await getMcpConnectionProfile(id)
    if (!data) return Response.json({ ok: false, error: { code: 'not_found', message: 'McpConnectionProfile not found.' } }, { status: 404 })
    return Response.json({ ok: true, data })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
