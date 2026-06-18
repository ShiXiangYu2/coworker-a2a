import { reviewReleaseReadiness } from '@/lib/production-security/repository'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params
  const body = await readOptionalJson(request)
  return reviewResponse(id, 'submit_review', body)
}

async function readOptionalJson(request: Request) {
  try {
    const body = await request.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function reviewResponse(id: string, action: 'submit_review', body: Record<string, unknown>) {
  try {
    const data = reviewReleaseReadiness({
      releaseReadinessId: id,
      action,
      reviewedBy: typeof body.reviewedBy === 'string' ? body.reviewedBy : undefined,
      decisionReason: typeof body.decisionReason === 'string' ? body.decisionReason : undefined,
    })
    return Response.json({ ok: true, data, auditEvents: data.auditEvents, observabilityEvents: data.observabilityEvents })
  } catch (error) {
    return Response.json(
      { ok: false, error: { code: 'production_security_error', message: error instanceof Error ? error.message : 'Unexpected error.' } },
      { status: 400 }
    )
  }
}
