import {
  getRuntimeExecutionReceiptByJobId,
  runtimeExecutionErrorResponse,
  SPRINT_22_SAFETY_NOTE,
} from '../../../_shared'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const receipt = await getRuntimeExecutionReceiptByJobId(id)
    if (!receipt) {
      return Response.json({
        ok: false,
        error: { code: 'not_found', message: 'Runtime execution receipt not found.' },
        safetyNote: SPRINT_22_SAFETY_NOTE,
      }, { status: 404 })
    }
    return Response.json({
      ok: true,
      data: receipt,
      safetyNote: SPRINT_22_SAFETY_NOTE,
    }, { status: 200 })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
