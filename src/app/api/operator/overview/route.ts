import { buildOperatorOverviewReadModel } from '@/lib/operator-console/overview-read-model'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = numberValue(url.searchParams.get('limit'))
    const data = await buildOperatorOverviewReadModel({ limit })

    return Response.json({ ok: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected operator overview API error.'
    return Response.json(
      { ok: false, error: { code: 'operator_overview_error', message } },
      { status: 500 }
    )
  }
}

function numberValue(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
