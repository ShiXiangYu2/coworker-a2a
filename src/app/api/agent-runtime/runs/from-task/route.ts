import { startAgentRunFromTask } from '@/lib/agent-runtime/repository'
import { agentRuntimeErrorResponse, readJson } from '../../_shared'
import { withAuth } from '@/lib/auth/middleware'

export const POST = withAuth(async (request) => {
  try {
    const body = await readJson(request)

    if (typeof body.taskId !== 'string' || !body.taskId.trim()) {
      return Response.json({ error: 'taskId is required.' }, { status: 400 })
    }

    if (
      body.idempotencyKey !== undefined &&
      typeof body.idempotencyKey !== 'string'
    ) {
      return Response.json(
        { error: 'idempotencyKey must be a string.' },
        { status: 400 }
      )
    }

    const trigger =
      body.trigger === 'manual' || body.trigger === 'task_ui' || body.trigger === 'api'
        ? body.trigger
        : 'api'

    return Response.json(
      await startAgentRunFromTask({
        taskId: body.taskId.trim(),
        idempotencyKey: body.idempotencyKey as string | undefined,
        trigger,
      }),
      { status: 201 }
    )
  } catch (error) {
    return agentRuntimeErrorResponse(error)
  }
})
