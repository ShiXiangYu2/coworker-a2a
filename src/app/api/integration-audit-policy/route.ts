import { getIntegrationAuditPolicy } from '@/lib/external-mcp-governance/repository'
import { externalMcpErrorResponse } from '@/app/api/external-action-proposals/_shared'

export async function GET() {
  try {
    return Response.json({ ok: true, data: await getIntegrationAuditPolicy() })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
