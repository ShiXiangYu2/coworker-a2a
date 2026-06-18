import { executionGatewayErrorResponse, transitionExecutionGatewayRecord } from '../../_shared'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const result = await transitionExecutionGatewayRecord({
      recordType: 'execution_intent_record',
      id,
      targetStatus: 'superseded',
      reason: 'Superseded local execution intent record only.',
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote })
  } catch (error) {
    return executionGatewayErrorResponse(error)
  }
}
