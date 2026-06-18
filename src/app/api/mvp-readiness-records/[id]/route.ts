import { prisma } from '@/lib/prisma'
import { mvpClosureErrorResponse } from '../_shared'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const record = await prisma.mVPReadinessRecord.findUnique({
      where: { id },
      include: { reviews: { orderBy: { createdAt: 'desc' } } },
    })

    if (!record) {
      return Response.json({ ok: false, error: { code: 'not_found', message: 'MVPReadinessRecord not found.' } }, { status: 404 })
    }

    return Response.json({ ok: true, data: record })
  } catch (error) {
    return mvpClosureErrorResponse(error)
  }
}

