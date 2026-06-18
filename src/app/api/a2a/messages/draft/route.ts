import { createA2AMessage } from '@/lib/memory/repository'
import { memoryErrorResponse, readJson, stringValue } from '../../../memory/_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const fromAgentId = stringValue(body.fromAgentId)
    const toAgentId = stringValue(body.toAgentId)
    const intent = stringValue(body.intent)
    const subject = stringValue(body.subject)
    const messageBody = stringValue(body.body)
    if (!fromAgentId) throw new Error('fromAgentId is required.')
    if (!toAgentId) throw new Error('toAgentId is required.')
    if (!intent) throw new Error('intent is required.')
    if (!subject) throw new Error('subject is required.')
    if (!messageBody) throw new Error('body is required.')

    const data = await createA2AMessage({
      taskId: stringValue(body.taskId),
      agentRunId: stringValue(body.agentRunId),
      fromAgentId: fromAgentId as never,
      toAgentId: toAgentId as never,
      intent: intent as never,
      subject,
      body: messageBody,
      requiresHumanConfirmation: body.requiresHumanConfirmation !== false,
      payload: typeof body.payload === 'object' && body.payload ? body.payload : undefined,
      idempotencyKey: stringValue(body.idempotencyKey),
    })

    return Response.json({ ok: true, data, auditEvents: [] }, { status: 201 })
  } catch (error) {
    return memoryErrorResponse(error)
  }
}
