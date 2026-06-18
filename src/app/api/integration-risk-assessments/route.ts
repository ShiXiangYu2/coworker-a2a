import { createIntegrationRiskAssessment, listIntegrationRiskAssessments } from '@/lib/external-mcp-governance/repository'
import { externalMcpErrorResponse, readJson, stringArray, stringValue } from '@/app/api/external-action-proposals/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    return Response.json({ ok: true, data: await listIntegrationRiskAssessments({ targetType: url.searchParams.get('targetType') ?? undefined, targetId: url.searchParams.get('targetId') ?? undefined }) })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const targetType = stringValue(body.targetType)
    const targetId = stringValue(body.targetId)
    if (!targetType || !targetId) throw new Error('targetType and targetId are required.')
    const result = await createIntegrationRiskAssessment({
      targetType: targetType as never,
      targetId,
      riskLevel: stringValue(body.riskLevel) as never,
      recommendation: stringValue(body.recommendation) as never,
      evidenceRefs: stringArray(body.evidenceRefs),
    })
    return Response.json({ ok: true, data: result.integrationRiskAssessment, auditEvents: result.auditEvents, observabilityEvents: result.observabilityEvents }, { status: 201 })
  } catch (error) {
    return externalMcpErrorResponse(error)
  }
}
