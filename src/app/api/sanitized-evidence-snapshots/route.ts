import { prisma } from '@/lib/prisma'
import { evidenceErrorResponse } from '@/app/api/evidence/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const importRecordId = url.searchParams.get('importRecordId') ?? undefined
    const records = await prisma.sanitizedEvidenceSnapshot.findMany({
      where: importRecordId ? { importRecordId } : { targetSprint: 'sprint_17' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return evidenceErrorResponse(error)
  }
}
