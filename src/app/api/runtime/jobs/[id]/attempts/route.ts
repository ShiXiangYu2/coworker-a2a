import {
  listRuntimeDispatchAttempts,
  runtimeExecutionErrorResponse,
  SPRINT_22_SAFETY_NOTE,
} from '../../../_shared'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const attempts = await listRuntimeDispatchAttempts(id)
    return Response.json({
      ok: true,
      data: attempts,
      safetyNote: SPRINT_22_SAFETY_NOTE,
    }, { status: 200 })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
