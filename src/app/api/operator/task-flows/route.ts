import { listOperatorTaskFlows } from '@/lib/operator-console/task-flow-read-model'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = numberValue(url.searchParams.get('limit'))
    const data = await listOperatorTaskFlows({ limit })

    return Response.json({ ok: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected operator task flow API error.'
    return Response.json(
      { ok: false, error: { code: 'operator_task_flow_error', message } },
      { status: 500 }
    )
  }
}

function numberValue(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
