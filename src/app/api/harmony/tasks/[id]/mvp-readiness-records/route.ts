import { prisma } from '@/lib/prisma'
import { mvpClosureErrorResponse } from '@/app/api/mvp-readiness-records/_shared'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const records = await prisma.mVPReadinessRecord.findMany({
      where: { evidenceRefsJson: { contains: id } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return mvpClosureErrorResponse(error)
  }
}
