import {
  createExecutionGate,
  createdBy,
  evidenceRefs,
  executionGatewayErrorResponse,
  gateDecision,
  listExecutionGates,
  readJson,
  requiredReviewer,
  requiredString,
  statusParam,
  stringArray,
  stringValue,
} from '../execution-intents/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listExecutionGates({
      status: statusParam(url.searchParams.get('status')),
      intentRecordId: stringValue(url.searchParams.get('intentRecordId')),
      planRecordId: stringValue(url.searchParams.get('planRecordId')),
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
    const result = await createExecutionGate({
      intentRecordId: stringValue(body.intentRecordId),
      planRecordId: stringValue(body.planRecordId),
      gateName: requiredString(body.gateName, 'gateName'),
      gateSummary: requiredString(body.gateSummary, 'gateSummary'),
      gateDecision: gateDecision(body.gateDecision),
      requiredReviewer: requiredReviewer(body.requiredReviewer),
      requiredEvidenceRefs: evidenceRefs(body.requiredEvidenceRefs),
      blockedReasons: stringArray(body.blockedReasons),
      createdBy: createdBy(body.createdBy),
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return executionGatewayErrorResponse(error)
  }
}
