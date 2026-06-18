import { createCollaborationSessionFromTask } from '@/lib/collaboration/repository'
import { collaborationErrorResponse, readJson, stringValue } from '../../collaboration/_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const taskId = stringValue(body.taskId)
    if (!taskId) throw new Error('taskId is required.')
    const result = await createCollaborationSessionFromTask({
      taskId,
      objective: stringValue(body.objective),
      summary: stringValue(body.summary),
      teamId: stringValue(body.teamId),
      sourceAgentRunId: stringValue(body.sourceAgentRunId),
      sourceEvalRunId: stringValue(body.sourceEvalRunId),
      idempotencyKey: stringValue(body.idempotencyKey),
      sourceSnapshot: body.sourceSnapshot,
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
