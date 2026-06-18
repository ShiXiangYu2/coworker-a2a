import { departmentErrorResponse, transitionDepartmentRecord } from '@/app/api/department-profiles/_shared'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await transitionDepartmentRecord({
      recordType: 'department_profile',
      id,
      targetStatus: 'archived',
      reason: 'Archived local department record only.',
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote })
  } catch (error) {
    return departmentErrorResponse(error)
  }
}
