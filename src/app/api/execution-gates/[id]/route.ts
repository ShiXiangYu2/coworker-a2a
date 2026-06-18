import { executionGatewayErrorResponse } from '../../execution-intents/_shared'
import { getExecutionGatewayRecordById } from '@/lib/execution-gateway'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await getExecutionGatewayRecordById('execution_gate_record', id)
    if (!record) return Response.json({ ok: false, error: { code: 'not_found', message: 'Execution gate record not found.' } }, { status: 404 })
    return Response.json({ ok: true, data: record })
  } catch (error) {
    return executionGatewayErrorResponse(error)
  }
}
