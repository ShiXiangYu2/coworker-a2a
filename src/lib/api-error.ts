/**
 * API Error — 统一错误处理
 *
 * 前后端统一的错误格式和处理逻辑。
 */

// ─── 错误类型 ──────────────────────────────────────────────────────

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'

export interface ApiError {
  ok: false
  error: string
  code?: ApiErrorCode
  details?: unknown
}

export interface ApiSuccess<T> {
  ok: true
  data: T
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─── 错误类 ────────────────────────────────────────────────────────

export class AppError extends Error {
  code: ApiErrorCode
  status: number
  details?: unknown

  constructor(
    message: string,
    code: ApiErrorCode = 'INTERNAL_ERROR',
    status: number = 500,
    details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = details
  }

  toJSON(): ApiError {
    return {
      ok: false,
      error: this.message,
      code: this.code,
      details: this.details,
    }
  }
}

// ─── 错误创建函数 ──────────────────────────────────────────────────

export function badRequest(message: string, details?: unknown): AppError {
  return new AppError(message, 'BAD_REQUEST', 400, details)
}

export function unauthorized(message: string = 'Unauthorized'): AppError {
  return new AppError(message, 'UNAUTHORIZED', 401)
}

export function forbidden(message: string = 'Forbidden'): AppError {
  return new AppError(message, 'FORBIDDEN', 403)
}

export function notFound(message: string = 'Not found'): AppError {
  return new AppError(message, 'NOT_FOUND', 404)
}

export function conflict(message: string): AppError {
  return new AppError(message, 'CONFLICT', 409)
}

export function rateLimited(message: string = 'Rate limited'): AppError {
  return new AppError(message, 'RATE_LIMITED', 429)
}

export function internalError(message: string, details?: unknown): AppError {
  return new AppError(message, 'INTERNAL_ERROR', 500, details)
}

// ─── 响应构建 ──────────────────────────────────────────────────────

export function successResponse<T>(data: T): Response {
  return Response.json({ ok: true, data })
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(error.toJSON(), { status: error.status })
  }

  const message = error instanceof Error ? error.message : String(error)
  return Response.json(
    { ok: false, error: message, code: 'INTERNAL_ERROR' },
    { status: 500 },
  )
}

// ─── 前端错误处理 ──────────────────────────────────────────────────

/**
 * 处理 API 响应
 */
export async function handleApiResponse<T>(response: Promise<Response>): Promise<T> {
  const res = await response

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new AppError(
      body.error ?? `HTTP ${res.status}`,
      body.code ?? 'INTERNAL_ERROR',
      res.status,
      body.details,
    )
  }

  const body = await res.json()
  if (!body.ok) {
    throw new AppError(
      body.error ?? 'Request failed',
      body.code ?? 'INTERNAL_ERROR',
      res.status,
    )
  }

  return body.data
}

/**
 * 统一的 fetch 包装器
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  return handleApiResponse<T>(response)
}
