import {
  createExecutionReceipt,
  createdBy,
  evidenceRefs,
  executionGatewayErrorResponse,
  listExecutionReceipts,
  readJson,
  receiptKind,
  requiredString,
  statusParam,
  stringValue,
} from '../execution-intents/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listExecutionReceipts({
      status: statusParam(url.searchParams.get('status')),
      intentRecordId: stringValue(url.searchParams.get('intentRecordId')),
      planRecordId: stringValue(url.searchParams.get('planRecordId')),
      gateRecordId: stringValue(url.searchParams.get('gateRecordId')),
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
    const result = await createExecutionReceipt({
      intentRecordId: stringValue(body.intentRecordId),
      planRecordId: stringValue(body.planRecordId),
      gateRecordId: stringValue(body.gateRecordId),
      receiptTitle: requiredString(body.receiptTitle, 'receiptTitle'),
      receiptSummary: requiredString(body.receiptSummary, 'receiptSummary'),
      observedOutcomeSummary: requiredString(body.observedOutcomeSummary, 'observedOutcomeSummary'),
      operatorNotes: requiredString(body.operatorNotes, 'operatorNotes'),
      evidenceRefs: evidenceRefs(body.evidenceRefs),
      receiptKind: receiptKind(body.receiptKind),
      createdBy: createdBy(body.createdBy),
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return executionGatewayErrorResponse(error)
  }
}
