import { departmentAssignmentErrorResponse, transitionDepartmentAssignmentRecord } from '../../../department-task-intakes/_shared'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const result = await transitionDepartmentAssignmentRecord({ recordType: 'department_assignment_approval_record', id, targetStatus: 'superseded', reason: 'Superseded local department assignment approval record only.' })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote })
  } catch (error) {
    return departmentAssignmentErrorResponse(error)
  }
}
