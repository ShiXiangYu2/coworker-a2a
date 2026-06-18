import { createHandoffRequest, listHandoffRequests } from '@/lib/collaboration/repository'
import { collaborationErrorResponse, isObject, readJson, stringValue } from '../collaboration/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listHandoffRequests({
      collaborationSessionId: url.searchParams.get('collaborationSessionId') ?? undefined,
      threadId: url.searchParams.get('threadId') ?? undefined,
    })
    return Response.json({ ok: true, data })
  } catch (error) {
    return collaborationErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const collaborationSessionId = stringValue(body.collaborationSessionId)
    const fromAgentId = stringValue(body.fromAgentId)
    const toAgentId = stringValue(body.toAgentId)
    const handoffType = stringValue(body.handoffType)
    const reason = stringValue(body.reason)
    const requestedScope = stringValue(body.requestedScope)
    const expectedOutput = stringValue(body.expectedOutput)
    if (!collaborationSessionId) throw new Error('collaborationSessionId is required.')
    if (!fromAgentId) throw new Error('fromAgentId is required.')
    if (!toAgentId) throw new Error('toAgentId is required.')
    if (!handoffType) throw new Error('handoffType is required.')
    if (!reason) throw new Error('reason is required.')
    if (!requestedScope) throw new Error('requestedScope is required.')
    if (!expectedOutput) throw new Error('expectedOutput is required.')
    const result = await createHandoffRequest({
      collaborationSessionId,
      threadId: stringValue(body.threadId),
      sourceA2AMessageId: stringValue(body.sourceA2AMessageId),
      sourceTurnId: stringValue(body.sourceTurnId),
      fromAgentId: fromAgentId as never,
      toAgentId: toAgentId as never,
      handoffType: handoffType as never,
      reason,
      requestedScope,
      expectedOutput,
      contextRefs: isObject(body.contextRefs) ? body.contextRefs : undefined,
      riskLevel: stringValue(body.riskLevel) as never,
      idempotencyKey: stringValue(body.idempotencyKey),
      createdBy: stringValue(body.createdBy) as never,
    })
    return Response.json({ ok: true, data: result.handoffRequest, auditEvents: result.auditEvents, observabilityEvents: result.observabilityEvents }, { status: 201 })
  } catch (error) {
    return collaborationErrorResponse(error)
  }
}
