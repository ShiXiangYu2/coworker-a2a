import { createContextPacketFromTask } from '@/lib/memory/repository'
import { memoryErrorResponse, readJson, stringValue } from '../../memory/_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const taskId = stringValue(body.taskId)
    if (!taskId) throw new Error('taskId is required.')

    const result = await createContextPacketFromTask({
      taskId,
      agentId: stringValue(body.agentId) as never,
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
