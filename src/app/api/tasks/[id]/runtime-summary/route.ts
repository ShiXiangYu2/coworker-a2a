import {
  getTaskRuntimeExecutionSummary,
  runtimeExecutionErrorResponse,
} from '../../../runtime/_shared'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const summary = await getTaskRuntimeExecutionSummary(id)
    return Response.json({
      ok: true,
      data: summary,
      safetyNote: summary.safetyNote,
    }, { status: 200 })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
