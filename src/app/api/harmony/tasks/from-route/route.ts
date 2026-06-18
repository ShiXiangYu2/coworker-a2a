import { createTaskFromRoute } from '@/lib/harmony/repository'
import { harmonyErrorResponse, readJson, validateRouteDecision } from '../../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const routeDecision = body.routeDecision

    if (!validateRouteDecision(routeDecision)) {
      return Response.json({ error: 'routeDecision is required.' }, { status: 400 })
    }

    if (
      typeof body.sourceMessageText !== 'string' ||
      !body.sourceMessageText.trim()
    ) {
      return Response.json(
        { error: 'sourceMessageText is required.' },
        { status: 400 }
      )
    }

    for (const field of ['idempotencyKey', 'conversationId', 'sourceMessageId']) {
      if (body[field] !== undefined && typeof body[field] !== 'string') {
        return Response.json(
          { error: `${field} must be a string.` },
          { status: 400 }
        )
      }
    }

    const bundle = await createTaskFromRoute({
      idempotencyKey: body.idempotencyKey as string | undefined,
      conversationId: body.conversationId as string | undefined,
      sourceMessageId: body.sourceMessageId as string | undefined,
      sourceMessageText: body.sourceMessageText.trim(),
      routeDecision,
    })

    return Response.json(bundle, { status: bundle.skippedReason ? 200 : 201 })
  } catch (error) {
    return harmonyErrorResponse(error)
  }
}
