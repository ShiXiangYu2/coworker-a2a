import { CollaborationRepositoryError } from '@/lib/collaboration/repository'

export function collaborationErrorResponse(error: unknown) {
  if (error instanceof CollaborationRepositoryError) {
    return Response.json(
      { ok: false, error: { code: 'collaboration_error', message: error.message } },
      { status: error.status }
    )
  }

  if (error instanceof Error) {
    return Response.json(
      { ok: false, error: { code: 'validation_error', message: error.message } },
      { status: 400 }
    )
  }

  return Response.json(
    { ok: false, error: { code: 'unexpected_error', message: 'Unexpected Sprint 9 API error.' } },
    { status: 500 }
  )
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json()
  if (!isObject(body)) throw new Error('JSON body must be an object.')
  return body
}

export async function readOptionalJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return await readJson(request)
  } catch {
    return {}
  }
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

export function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : undefined
}
