import {
  listAgentTaskRunRecordsByCorrelationId,
  listRecentAgentTaskRunRecords,
} from '@/lib/agent-task-runner/repository'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const correlationId = stringValue(url.searchParams.get('correlationId'))
    const limit = numberValue(url.searchParams.get('limit'))
    const data = correlationId
      ? await listAgentTaskRunRecordsByCorrelationId({ correlationId, limit })
      : await listRecentAgentTaskRunRecords({ limit })

    return Response.json({ ok: true, data })
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: {
          code: 'agent_task_runs_query_error',
          message: error instanceof Error ? error.message : 'Unable to query agent task runs.',
        },
      },
      { status: 400 }
    )
  }
}

function stringValue(value: string | null): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function numberValue(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
