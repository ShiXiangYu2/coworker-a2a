import {
  listRuntimeDispatchJobs,
  runtimeExecutionErrorResponse,
  SPRINT_22_SAFETY_NOTE,
} from '../../../runtime/_shared'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const records = await listRuntimeDispatchJobs({ taskId: id, limit: 100 })
    return Response.json({ ok: true, data: { taskId: id, jobs: records }, safetyNote: SPRINT_22_SAFETY_NOTE })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
