import { createToolCallsFromAgentResult } from '@/lib/tools/repository'
import { readJson, stringValue, toolErrorResponse } from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const agentRunId = stringValue(body.agentRunId)
    if (!agentRunId) throw new Error('agentRunId is required.')

    const result = await createToolCallsFromAgentResult({
      agentRunId,
      agentResult:
        typeof body.agentResult === 'object' && body.agentResult
          ? body.agentResult as never
          : undefined,
      idempotencyKey: stringValue(body.idempotencyKey),
    })

    return Response.json(
      { ok: true, data: result.toolCalls, auditEvents: result.auditEvents },
      { status: 201 }
    )
  } catch (error) {
    return toolErrorResponse(error)
  }
}
