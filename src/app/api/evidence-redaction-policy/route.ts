import { prisma } from '@/lib/prisma'
import {
  ensureDefaultEvidenceRedactionPolicy,
  evidenceErrorResponse,
} from '@/lib/evidence'

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    if (url.searchParams.get('ensureDefault') === 'true') {
      const policy = await ensureDefaultEvidenceRedactionPolicy(stringValue(url.searchParams.get('correlationId')))
      return Response.json({ ok: true, data: policy })
    }
    const records = await prisma.evidenceRedactionPolicy.findMany({
      where: { targetSprint: 'sprint_17' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return evidenceErrorResponse(error)
  }
}
