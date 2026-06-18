import { createContextPacketFromAgentRun } from '@/lib/memory/repository'
import { memoryErrorResponse, readJson, stringValue } from '../../memory/_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const agentRunId = stringValue(body.agentRunId)
    if (!agentRunId) throw new Error('agentRunId is required.')

    const result = await createContextPacketFromAgentRun({
      taskId: stringValue(body.taskId) ?? 'loaded-from-agent-run',
      agentRunId,
      idempotencyKey: stringValue(body.idempotencyKey),
      createdBy: body.createdBy === 'human' ? 'human' : 'system',
      selectionPolicy:
        typeof body.selectionPolicy === 'object' && body.selectionPolicy
          ? body.selectionPolicy
          : undefined,
    })

    return Response.json({ ok: true, data: result.contextPacket, auditEvents: result.auditEvents }, { status: 201 })
  } catch (error) {
    return memoryErrorResponse(error)
  }
}
