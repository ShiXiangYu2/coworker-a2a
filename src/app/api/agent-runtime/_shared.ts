import { AgentRuntimeRepositoryError } from '@/lib/agent-runtime/repository'

export function agentRuntimeErrorResponse(error: unknown) {
  if (error instanceof AgentRuntimeRepositoryError) {
    return Response.json({ error: error.message }, { status: error.status })
  }

  if (error instanceof Error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ error: 'Unexpected Agent Runtime API error.' }, { status: 500 })
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json()
  if (!isObject(body)) throw new Error('JSON body must be an object.')
  return body
}
