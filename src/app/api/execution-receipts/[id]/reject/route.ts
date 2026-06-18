import { executionGatewayErrorResponse, transitionExecutionGatewayRecord } from '../../../execution-intents/_shared'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const result = await transitionExecutionGatewayRecord({
      recordType: 'execution_receipt_record',
      id,
      targetStatus: 'rejected',
      reason: 'Rejected local execution receipt record only.',
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote })
  } catch (error) {
    return executionGatewayErrorResponse(error)
  }
}
