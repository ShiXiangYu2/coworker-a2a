import { departmentAssignmentErrorResponse, getDepartmentAssignmentProposalRoleFit } from '../../../department-task-intakes/_shared'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await getDepartmentAssignmentProposalRoleFit(id)
    return Response.json({ ok: true, data })
  } catch (error) {
    return departmentAssignmentErrorResponse(error)
  }
}
