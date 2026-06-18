import { getRegressionGate } from '@/lib/production-security/repository'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const data = getRegressionGate(id)
  if (!data) {
    return Response.json(
      { ok: false, error: { code: 'not_found', message: 'RegressionGate not found.' } },
      { status: 404 }
    )
  }
  return Response.json({ ok: true, data })
}
