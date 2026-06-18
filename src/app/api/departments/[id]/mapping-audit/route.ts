import { departmentMappingErrorResponse, getDepartmentMappingAudit } from '@/app/api/department-evidence-mappings/_shared'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await getDepartmentMappingAudit(id)
    return Response.json({ ok: true, data })
  } catch (error) {
    return departmentMappingErrorResponse(error)
  }
}
