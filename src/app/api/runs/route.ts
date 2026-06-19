import { listRecentRuns } from '@/lib/runs/repository'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listRecentRuns({ limit: numberValue(url.searchParams.get('limit')) })

    return Response.json({ ok: true, data })
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: {
          code: 'runs_query_error',
          message: error instanceof Error ? error.message : 'Unable to query recent runs.',
        },
      },
      { status: 400 }
    )
  }
}

function numberValue(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(1, Math.min(50, Math.trunc(parsed))) : undefined
}
