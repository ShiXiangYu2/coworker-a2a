import { prisma } from '@/lib/prisma'
import { evidenceErrorResponse } from '@/app/api/evidence/_shared'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await prisma.evidenceSourceProfile.findUnique({ where: { id } })
    if (!record) return Response.json({ ok: false, error: 'Evidence source profile not found.' }, { status: 404 })
    return Response.json({ ok: true, data: record })
  } catch (error) {
    return evidenceErrorResponse(error)
  }
}
