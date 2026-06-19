import {
  getRuntimeDispatchJobTimeline,
  runtimeExecutionErrorResponse,
} from '../../../_shared'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const timeline = await getRuntimeDispatchJobTimeline(id)
    return Response.json({
      ok: true,
      data: timeline,
      safetyNote: timeline.safetyNote,
    }, { status: 200 })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
