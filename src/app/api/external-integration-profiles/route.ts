import { createExternalIntegrationProfile, listExternalIntegrationProfiles } from '@/lib/external-mcp-governance/repository'
import { endpointMetadataValue, externalMcpErrorResponse, readJson, stringArray, stringValue } from '@/app/api/external-action-proposals/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    return Response.json({ ok: true, data: await listExternalIntegrationProfiles({ status: url.searchParams.get('status') ?? undefined, providerType: url.searchParams.get('providerType') ?? undefined }) })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const name = stringValue(body.name)
    if (!name) throw new Error('name is required.')
    const result = await createExternalIntegrationProfile({
      name,
      providerType: stringValue(body.providerType) as never,
      endpointMetadata: endpointMetadataValue(body.endpointMetadata),
      authMetadata: { authType: (stringValue(body.authType) ?? 'unknown') as never, storesSecrets: false },
      sourceEvidenceRefs: stringArray(body.sourceEvidenceRefs),
      sourceRedactionStatus: stringValue(body.sourceRedactionStatus) as never,
      riskLevel: stringValue(body.riskLevel) as never,
      createdBy: stringValue(body.createdBy) as never,
    })
    return Response.json({ ok: true, data: result.externalIntegrationProfile, auditEvents: result.auditEvents, observabilityEvents: result.observabilityEvents }, { status: 201 })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
