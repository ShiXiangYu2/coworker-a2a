import { departmentMappingErrorResponse, transitionDepartmentMappingRecord } from '@/app/api/department-evidence-mappings/_shared'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await transitionDepartmentMappingRecord({
      recordType: 'department_mapping_review_record',
      id,
      targetStatus: 'approved_record',
      reason: 'Approved one local department mapping review record only.',
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote })
  } catch (error) {
    return departmentMappingErrorResponse(error)
  }
}

