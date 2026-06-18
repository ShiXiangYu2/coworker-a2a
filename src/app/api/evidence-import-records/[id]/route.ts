import { prisma } from '@/lib/prisma'
import { evidenceErrorResponse } from '@/app/api/evidence/_shared'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await prisma.evidenceImportRecord.findUnique({
      where: { id },
      include: {
        sourceProfile: true,
        redactionPolicy: true,
        snapshots: true,
        reviews: true,
      },
    })
    if (!record) return Response.json({ ok: false, error: 'Evidence import record not found.' }, { status: 404 })
    return Response.json({ ok: true, data: record })
  } catch (error) {
    return evidenceErrorResponse(error)
  }
}
