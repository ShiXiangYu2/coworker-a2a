import {
  buildRuntimeOperatorTaskViewModel,
  runtimeExecutionErrorResponse,
} from '../../../runtime/_shared'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const view = await buildRuntimeOperatorTaskViewModel(id)
    return Response.json({
      ok: true,
      data: view,
      safetyNote: view.safetyNote,
    }, { status: 200 })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
