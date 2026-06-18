import { departmentAssignmentErrorResponse, transitionDepartmentAssignmentRecord } from '../../../department-task-intakes/_shared'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const result = await transitionDepartmentAssignmentRecord({ recordType: 'department_assignment_proposal', id, targetStatus: 'rejected', reason: 'Rejected local department assignment proposal only.' })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote })
  } catch (error) {
    return departmentAssignmentErrorResponse(error)
  }
}
