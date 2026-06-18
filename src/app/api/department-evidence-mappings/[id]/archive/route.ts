import { departmentMappingErrorResponse, transitionDepartmentMappingRecord } from '../../_shared'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await transitionDepartmentMappingRecord({
      recordType: 'evidence_to_department_mapping_record',
      id,
      targetStatus: 'archived',
      reason: 'Archived one local department evidence mapping record only.',
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote })
  } catch (error) {
    return departmentMappingErrorResponse(error)
  }
}
