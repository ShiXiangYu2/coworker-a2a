import { departmentErrorResponse } from '@/app/api/department-profiles/_shared'
import { getDepartmentRecordById } from '@/lib/department'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await getDepartmentRecordById('department_profile', id)
    if (!record) return Response.json({ ok: false, error: { code: 'not_found', message: 'Department record not found.' } }, { status: 404 })
    return Response.json({ ok: true, data: record })
  } catch (error) {
    return departmentErrorResponse(error)
  }
}
