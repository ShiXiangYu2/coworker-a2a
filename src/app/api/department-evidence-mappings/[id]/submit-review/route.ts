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
      targetStatus: 'review',
      reason: 'Submitted local department evidence mapping record for review only.',
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote })
  } catch (error) {
    return departmentMappingErrorResponse(error)
  }
}
