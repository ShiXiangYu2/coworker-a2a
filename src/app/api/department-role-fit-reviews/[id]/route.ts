import { departmentAssignmentErrorResponse, getDepartmentAssignmentRecordById } from '../../department-task-intakes/_shared'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const record = await getDepartmentAssignmentRecordById('department_role_fit_review', id)
    if (!record) return Response.json({ ok: false, error: { code: 'not_found', message: 'Department role fit review not found.' } }, { status: 404 })
    return Response.json({ ok: true, data: record })
  } catch (error) {
    return departmentAssignmentErrorResponse(error)
  }
}
