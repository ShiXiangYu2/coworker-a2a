import {
  getRuntimeExecutionTokenById,
  runtimeExecutionErrorResponse,
  SPRINT_22_SAFETY_NOTE,
} from '../../_shared'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await getRuntimeExecutionTokenById(id)
    if (!record) return Response.json({ ok: false, error: { code: 'not_found', message: 'Runtime execution token not found.' }, safetyNote: SPRINT_22_SAFETY_NOTE }, { status: 404 })
    return Response.json({ ok: true, data: record, safetyNote: SPRINT_22_SAFETY_NOTE })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
