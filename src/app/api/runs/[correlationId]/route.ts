import { getRunByCorrelationId } from '@/lib/runs/repository'

export async function GET(_request: Request, { params }: { params: Promise<{ correlationId: string }> }) {
  try {
    const { correlationId } = await params
    const data = await getRunByCorrelationId({ correlationId })

    return Response.json({ ok: true, data })
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: {
          code: 'run_query_error',
          message: error instanceof Error ? error.message : 'Unable to query run.',
        },
      },
      { status: 400 }
    )
  }
}
