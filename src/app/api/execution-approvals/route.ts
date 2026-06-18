import {
  createExecutionApproval,
  createdBy,
  evidenceRefs,
  executionGatewayErrorResponse,
  listExecutionApprovals,
  readJson,
  requiredString,
  reviewTargetType,
  reviewer,
  statusParam,
  stringValue,
  verdict,
} from '../execution-intents/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listExecutionApprovals({
      status: statusParam(url.searchParams.get('status')),
      targetId: stringValue(url.searchParams.get('targetId')),
      limit: Number(url.searchParams.get('limit') ?? 50),
    })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return executionGatewayErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = await createExecutionApproval({
      targetType: reviewTargetType(requiredString(body.targetType, 'targetType')),
      targetId: requiredString(body.targetId, 'targetId'),
      reviewer: reviewer(body.reviewer),
      verdict: verdict(body.verdict),
      reviewNotes: requiredString(body.reviewNotes, 'reviewNotes'),
      confirmationArtifactId: stringValue(body.confirmationArtifactId),
      evidenceRefs: evidenceRefs(body.evidenceRefs),
      createdBy: createdBy(body.createdBy),
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return executionGatewayErrorResponse(error)
  }
}
