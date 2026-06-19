import {
  listRuntimeRecoveryPoints,
  runtimeExecutionErrorResponse,
  SPRINT_22_SAFETY_NOTE,
} from '../../../_shared'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const recoveryPoints = await listRuntimeRecoveryPoints(id)
    return Response.json({
      ok: true,
      data: recoveryPoints,
      safetyNote: SPRINT_22_SAFETY_NOTE,
    }, { status: 200 })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
