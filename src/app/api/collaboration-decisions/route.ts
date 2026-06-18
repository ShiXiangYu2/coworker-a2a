import { createCollaborationDecision, listCollaborationDecisions } from '@/lib/collaboration/repository'
import { collaborationErrorResponse, isObject, readJson, stringValue } from '../collaboration/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listCollaborationDecisions({
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
    const decisionType = stringValue(body.decisionType)
    const title = stringValue(body.title)
    const rationale = stringValue(body.rationale)
    const recommendation = stringValue(body.recommendation)
    if (!collaborationSessionId) throw new Error('collaborationSessionId is required.')
    if (!decisionType) throw new Error('decisionType is required.')
    if (!title) throw new Error('title is required.')
    if (!rationale) throw new Error('rationale is required.')
    if (!recommendation) throw new Error('recommendation is required.')
    const result = await createCollaborationDecision({
      collaborationSessionId,
      threadId: stringValue(body.threadId),
      decisionType: decisionType as never,
      title,
      rationale,
      recommendation,
      decisionInputs: isObject(body.decisionInputs) ? body.decisionInputs : undefined,
      riskLevel: stringValue(body.riskLevel) as never,
      idempotencyKey: stringValue(body.idempotencyKey),
      createdBy: stringValue(body.createdBy) as never,
    })
    return Response.json({ ok: true, data: result.collaborationDecision, auditEvents: result.auditEvents, observabilityEvents: result.observabilityEvents }, { status: 201 })
  } catch (error) {
    return collaborationErrorResponse(error)
  }
}
