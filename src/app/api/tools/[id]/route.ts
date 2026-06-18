import { getTool } from '@/lib/tools/repository'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const data = getTool(id)
  if (!data) {
    return Response.json(
      { ok: false, error: { code: 'not_found', message: 'Tool not found.' } },
      { status: 404 }
    )
  }
  return Response.json({ ok: true, data })
}
