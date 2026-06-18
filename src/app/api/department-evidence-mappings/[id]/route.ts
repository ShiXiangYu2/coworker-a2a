import { departmentMappingErrorResponse } from '../_shared'
import { getDepartmentMappingRecordById } from '@/lib/department-mapping'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await getDepartmentMappingRecordById('evidence_to_department_mapping_record', id)
    if (!record) return Response.json({ ok: false, error: { code: 'not_found', message: 'Mapping record not found.' } }, { status: 404 })
    return Response.json({ ok: true, data: record })
  } catch (error) {
    return departmentMappingErrorResponse(error)
  }
}
