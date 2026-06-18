import { departmentErrorResponse, readJson, stringValue, transitionDepartmentRecord } from '@/app/api/department-profiles/_shared'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await readJson(request)
    const result = await transitionDepartmentRecord({
      recordType: 'department_agent_role',
      id,
      targetStatus: 'superseded',
      supersededByRecordId: stringValue(body.supersededByRecordId),
      reason: stringValue(body.supersedeReason) ?? 'Superseded local department record only.',
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote })
  } catch (error) {
    return departmentErrorResponse(error)
  }
}
