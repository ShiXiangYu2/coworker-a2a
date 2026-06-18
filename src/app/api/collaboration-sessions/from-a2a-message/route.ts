import { createCollaborationSessionFromA2AMessage } from '@/lib/collaboration/repository'
import { collaborationErrorResponse, readJson, stringValue } from '../../collaboration/_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const a2aMessageId = stringValue(body.a2aMessageId)
    if (!a2aMessageId) throw new Error('a2aMessageId is required.')
    const result = await createCollaborationSessionFromA2AMessage({
      a2aMessageId,
      teamId: stringValue(body.teamId),
      idempotencyKey: stringValue(body.idempotencyKey),
      createdBy: stringValue(body.createdBy) as never,
    })
    return Response.json(
      {
        ok: true,
        data: result.collaborationSession,
        auditEvents: result.auditEvents,
        observabilityEvents: result.observabilityEvents,
      },
      { status: 201 }
    )
  } catch (error) {
    return collaborationErrorResponse(error)
  }
}
