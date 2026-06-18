import { executionGatewayErrorResponse } from '../_shared'
import { getExecutionGatewayRecordById } from '@/lib/execution-gateway'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await getExecutionGatewayRecordById('execution_intent_record', id)
    if (!record) return Response.json({ ok: false, error: { code: 'not_found', message: 'Execution intent record not found.' } }, { status: 404 })
    return Response.json({ ok: true, data: record })
  } catch (error) {
    return executionGatewayErrorResponse(error)
  }
}
