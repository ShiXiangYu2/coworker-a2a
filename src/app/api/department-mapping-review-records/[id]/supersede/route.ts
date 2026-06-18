import { departmentMappingErrorResponse, readJson, stringValue, transitionDepartmentMappingRecord } from '@/app/api/department-evidence-mappings/_shared'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await readJson(request).catch((): Record<string, unknown> => ({}))
    const result = await transitionDepartmentMappingRecord({
      recordType: 'department_mapping_review_record',
      id,
      targetStatus: 'superseded',
      supersededByRecordId: stringValue(body.supersededByRecordId),
      reason: stringValue(body.reason) ?? 'Superseded by another local department mapping review record only.',
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote })
  } catch (error) {
    return departmentMappingErrorResponse(error)
  }
}

