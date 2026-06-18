import {
  createExecutionPlan,
  createdBy,
  evidenceRefs,
  executionGatewayErrorResponse,
  listExecutionPlans,
  readJson,
  requiredString,
  statusParam,
  stringArray,
  stringValue,
} from '../execution-intents/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listExecutionPlans({
      status: statusParam(url.searchParams.get('status')),
      intentRecordId: stringValue(url.searchParams.get('intentRecordId')),
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
    const result = await createExecutionPlan({
      intentRecordId: requiredString(body.intentRecordId, 'intentRecordId'),
      planTitle: requiredString(body.planTitle, 'planTitle'),
      planSummary: requiredString(body.planSummary, 'planSummary'),
      plannedSteps: stringArray(body.plannedSteps),
      preconditions: stringArray(body.preconditions),
      postconditions: stringArray(body.postconditions),
      humanCheckpoints: stringArray(body.humanCheckpoints),
      riskControls: stringArray(body.riskControls),
      rollbackNotes: requiredString(body.rollbackNotes, 'rollbackNotes'),
      sanitizedEvidenceRefs: evidenceRefs(body.sanitizedEvidenceRefs),
      createdBy: createdBy(body.createdBy),
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return executionGatewayErrorResponse(error)
  }
}
