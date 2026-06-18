import type { RouteDecision } from '@/lib/agents/types'
import { HarmonyRepositoryError } from '@/lib/harmony/repository'

export function harmonyErrorResponse(error: unknown) {
  if (error instanceof HarmonyRepositoryError) {
    return Response.json({ error: error.message }, { status: error.status })
  }

  if (error instanceof Error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ error: 'Unexpected Harmony API error.' }, { status: 500 })
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateRouteDecision(value: unknown): value is RouteDecision {
  if (!isObject(value)) return false

  return (
    typeof value.status === 'string' &&
    typeof value.decisionType === 'string' &&
    typeof value.confidence === 'number' &&
    typeof value.reason === 'string' &&
    Array.isArray(value.matchedSignals) &&
    typeof value.requiresHumanConfirmation === 'boolean' &&
    isObject(value.next) &&
    isObject(value.sideEffects)
  )
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json()
  if (!isObject(body)) throw new Error('JSON body must be an object.')
  return body
}
