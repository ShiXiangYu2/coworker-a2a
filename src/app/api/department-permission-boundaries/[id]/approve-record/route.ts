import { departmentErrorResponse, transitionDepartmentRecord } from '@/app/api/department-profiles/_shared'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await transitionDepartmentRecord({
      recordType: 'department_permission_boundary',
      id,
      targetStatus: 'approved_record',
      reason: 'Approved local department record only; no execution, routing, permission, release, deploy, or task completion.',
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote })
  } catch (error) {
    return departmentErrorResponse(error)
  }
}
