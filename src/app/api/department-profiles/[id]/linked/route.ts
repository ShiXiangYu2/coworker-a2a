import { departmentErrorResponse, getDepartmentLinkedRecords } from '@/app/api/department-profiles/_shared'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await getDepartmentLinkedRecords(id)
    return Response.json({ ok: true, data })
  } catch (error) {
    return departmentErrorResponse(error)
  }
}

