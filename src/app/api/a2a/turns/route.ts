import { createA2ATurn } from '@/lib/collaboration/repository'
import { collaborationErrorResponse, readJson, stringArray, stringValue } from '../../collaboration/_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const collaborationSessionId = stringValue(body.collaborationSessionId)
    const threadId = stringValue(body.threadId)
    const speakerAgentId = stringValue(body.speakerAgentId)
    const title = stringValue(body.title)
    const turnBody = stringValue(body.body)
    if (!collaborationSessionId) throw new Error('collaborationSessionId is required.')
    if (!threadId) throw new Error('threadId is required.')
    if (!speakerAgentId) throw new Error('speakerAgentId is required.')
    if (!title) throw new Error('title is required.')
    if (!turnBody) throw new Error('body is required.')
    const result = await createA2ATurn({
      collaborationSessionId,
      threadId,
      speakerAgentId: speakerAgentId as never,
      audienceAgentIds: (stringArray(body.audienceAgentIds) ?? []) as never,
      turnType: stringValue(body.turnType) as never,
      title,
      body: turnBody,
      sourceA2AMessageId: stringValue(body.sourceA2AMessageId),
      sourceAgentRunId: stringValue(body.sourceAgentRunId),
      inputSnapshot: body.inputSnapshot,
      outputSnapshot: body.outputSnapshot,
      riskLevel: stringValue(body.riskLevel) as never,
      idempotencyKey: stringValue(body.idempotencyKey),
      createdBy: stringValue(body.createdBy) as never,
    })
    return Response.json({ ok: true, data: result.a2aTurn, auditEvents: result.auditEvents, observabilityEvents: result.observabilityEvents }, { status: 201 })
  } catch (error) {
    return collaborationErrorResponse(error)
  }
}
