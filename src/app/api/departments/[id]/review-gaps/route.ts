import { departmentMappingErrorResponse, listDepartmentReviewGaps } from '@/app/api/department-evidence-mappings/_shared'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const url = new URL(request.url)
    const records = await listDepartmentReviewGaps({
      departmentProfileId: id,
      limit: Number(url.searchParams.get('limit') ?? 100),
    })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return departmentMappingErrorResponse(error)
  }
}
