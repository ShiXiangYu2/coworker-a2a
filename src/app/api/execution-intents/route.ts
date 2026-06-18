import {
  createExecutionIntent,
  createdBy,
  evidenceRefs,
  executionGatewayErrorResponse,
  listExecutionIntents,
  readJson,
  requestedBy,
  requiredString,
  statusParam,
  stringArray,
  stringValue,
} from './_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listExecutionIntents({
      status: statusParam(url.searchParams.get('status')),
      departmentProfileId: stringValue(url.searchParams.get('departmentProfileId')),
      sourceTaskId: stringValue(url.searchParams.get('sourceTaskId')),
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
    const result = await createExecutionIntent({
      intentTitle: requiredString(body.intentTitle, 'intentTitle'),
      intentSummary: requiredString(body.intentSummary, 'intentSummary'),
      requestedBy: requestedBy(body.requestedBy),
      departmentProfileId: stringValue(body.departmentProfileId),
      departmentAgentRoleId: stringValue(body.departmentAgentRoleId),
      sourceTaskId: stringValue(body.sourceTaskId),
      requestedActionType: requiredString(body.requestedActionType, 'requestedActionType'),
      requestedActionSummary: requiredString(body.requestedActionSummary, 'requestedActionSummary'),
      expectedOutcome: requiredString(body.expectedOutcome, 'expectedOutcome'),
      riskSummary: requiredString(body.riskSummary, 'riskSummary'),
      sanitizedEvidenceRefs: evidenceRefs(body.sanitizedEvidenceRefs),
      departmentMappingRefs: stringArray(body.departmentMappingRefs),
      createdBy: createdBy(body.createdBy),
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return executionGatewayErrorResponse(error)
  }
}
