import { routeMessageLLM } from '@/lib/agents/llm-router'

export async function handleAgentRouterPost(request: Request) {
  try {
    const body = await request.json()
    const { message, conversationId } = body

    if (!message || typeof message !== 'string' || !message.trim()) {
      return Response.json({ error: 'Message is required.' }, { status: 400 })
    }

    if (conversationId !== undefined && typeof conversationId !== 'string') {
      return Response.json({ error: 'conversationId must be a string.' }, { status: 400 })
    }

    const decision = await routeMessageLLM({
      message,
      conversationId,
    })

    return Response.json(decision)
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
}
