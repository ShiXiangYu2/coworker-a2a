import { createMemoryCandidatesFromAgentResult } from '@/lib/memory/repository'
import { memoryErrorResponse, readJson, stringValue } from '../../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const agentRunId = stringValue(body.agentRunId)
    const taskId = stringValue(body.taskId)
    const agentId = stringValue(body.agentId)
    if (!agentRunId) throw new Error('agentRunId is required.')
    if (!taskId) throw new Error('taskId is required.')
    if (!agentId) throw new Error('agentId is required.')

    const result = await createMemoryCandidatesFromAgentResult({
      agentRunId,
      taskId,
      agentId: agentId as never,
      agentResult:
        typeof body.agentResult === 'object' && body.agentResult ? body.agentResult as never : undefined,
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.memoryEntries, auditEvents: result.auditEvents }, { status: 201 })
  } catch (error) {
    return memoryErrorResponse(error)
  }
}
