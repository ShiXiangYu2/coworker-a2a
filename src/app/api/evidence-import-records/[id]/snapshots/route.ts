import { prisma } from '@/lib/prisma'
import { evidenceErrorResponse } from '@/app/api/evidence/_shared'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const records = await prisma.sanitizedEvidenceSnapshot.findMany({
      where: { importRecordId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return evidenceErrorResponse(error)
  }
}
