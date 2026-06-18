import { departmentAssignmentErrorResponse, getDepartmentAssignmentRecordById } from '../_shared'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const record = await getDepartmentAssignmentRecordById('department_task_intake_record', id)
    if (!record) return Response.json({ ok: false, error: { code: 'not_found', message: 'Department task intake record not found.' } }, { status: 404 })
    return Response.json({ ok: true, data: record })
  } catch (error) {
    return departmentAssignmentErrorResponse(error)
  }
}
