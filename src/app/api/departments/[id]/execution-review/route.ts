import { executionGatewayErrorResponse, getDepartmentExecutionReview } from '../../../execution-intents/_shared'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await getDepartmentExecutionReview(id)
    return Response.json({ ok: true, data })
  } catch (error) {
    return executionGatewayErrorResponse(error)
  }
}
