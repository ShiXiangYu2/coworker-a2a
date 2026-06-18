import { ObservabilityRepositoryError } from '@/lib/observability/repository'

export function observabilityErrorResponse(error: unknown) {
  if (error instanceof ObservabilityRepositoryError) {
    return Response.json(
      { ok: false, error: { code: 'observability_error', message: error.message } },
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
    { ok: false, error: { code: 'unexpected_error', message: 'Unexpected Sprint 8 API error.' } },
    { status: 500 }
  )
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json()
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('JSON body must be an object.')
  }
  return body as Record<string, unknown>
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

export function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

