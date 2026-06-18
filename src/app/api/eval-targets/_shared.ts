import { EvalRepositoryError } from '@/lib/eval/repository'

export function evalErrorResponse(error: unknown) {
  if (error instanceof EvalRepositoryError) {
    return Response.json(
      { ok: false, error: { code: 'eval_error', message: error.message } },
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
    { ok: false, error: { code: 'unexpected_error', message: 'Unexpected Sprint 7 API error.' } },
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

export function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}
