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
      targetStatus: 'review',
      reason: 'Submitted local department record for review only.',
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote })
  } catch (error) {
    return departmentErrorResponse(error)
  }
}
