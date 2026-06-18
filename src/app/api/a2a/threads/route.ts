import { createA2AThread } from '@/lib/collaboration/repository'
import { collaborationErrorResponse, readJson, stringArray, stringValue } from '../../collaboration/_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const collaborationSessionId = stringValue(body.collaborationSessionId)
    const topic = stringValue(body.topic)
    if (!collaborationSessionId) throw new Error('collaborationSessionId is required.')
    if (!topic) throw new Error('topic is required.')
    const result = await createA2AThread({
      collaborationSessionId,
      topic,
      purpose: stringValue(body.purpose) as never,
      participantAgentIds: stringArray(body.participantAgentIds) as never,
      idempotencyKey: stringValue(body.idempotencyKey),
      createdBy: stringValue(body.createdBy) as never,
    })
    return Response.json({ ok: true, data: result.a2aThread, auditEvents: result.auditEvents, observabilityEvents: result.observabilityEvents }, { status: 201 })
  } catch (error) {
    return collaborationErrorResponse(error)
  }
}
