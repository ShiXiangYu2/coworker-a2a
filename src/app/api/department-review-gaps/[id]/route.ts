import { departmentMappingErrorResponse } from '@/app/api/department-evidence-mappings/_shared'
import { getDepartmentMappingRecordById } from '@/lib/department-mapping'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await getDepartmentMappingRecordById('department_review_gap_record', id)
    if (!record) return Response.json({ ok: false, error: { code: 'not_found', message: 'Sprint 19 local mapping record not found.' } }, { status: 404 })
    return Response.json({ ok: true, data: record })
  } catch (error) {
    return departmentMappingErrorResponse(error)
  }
}

