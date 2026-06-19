import {
  blockRuntimeDispatchJob,
  buildRuntimeOperatorTaskViewModel,
  claimRuntimeDispatchJob,
  completeRuntimeDispatchJobDryRun,
  completeRuntimeDispatchJobObsidianWrite,
  createRuntimeDispatchJob,
  createRuntimeExecutionToken,
  failRuntimeDispatchJob,
  getRuntimeDispatchJobById,
  getRuntimeExecutionReceiptByJobId,
  getRuntimeExecutionTokenById,
  getRuntimeDispatchJobTimeline,
  getTaskRuntimeExecutionSummary,
  heartbeatRuntimeDispatchJob,
  listRuntimeDispatchAttempts,
  listRuntimeDispatchJobs,
  listRuntimeExecutionTokens,
  listRuntimeRecoveryPoints,
  RuntimeExecutionApiError,
  runRuntimeDispatchJobOnce,
  seedRuntimeSampleJob,
  SPRINT_22_SAFETY_NOTE,
  startRuntimeDispatchJob,
} from '@/lib/runtime-execution'
import type {
  FindRuntimeExecutionQuery,
  RuntimeDispatchJobStatus,
  RuntimeExecutionActionType,
  RuntimeExecutionConnectorId,
  RuntimeExecutionScope,
  RuntimeExecutionTokenStatus,
  StructuredRuntimeExecutionPlan,
} from '@/lib/runtime-execution'

export {
  createRuntimeDispatchJob,
  createRuntimeExecutionToken,
  buildRuntimeOperatorTaskViewModel,
  claimRuntimeDispatchJob,
  heartbeatRuntimeDispatchJob,
  startRuntimeDispatchJob,
  failRuntimeDispatchJob,
  blockRuntimeDispatchJob,
  completeRuntimeDispatchJobDryRun,
  completeRuntimeDispatchJobObsidianWrite,
  runRuntimeDispatchJobOnce,
  seedRuntimeSampleJob,
  getRuntimeDispatchJobById,
  getRuntimeExecutionReceiptByJobId,
  getRuntimeExecutionTokenById,
  getRuntimeDispatchJobTimeline,
  getTaskRuntimeExecutionSummary,
  listRuntimeDispatchAttempts,
  listRuntimeDispatchJobs,
  listRuntimeExecutionTokens,
  listRuntimeRecoveryPoints,
  SPRINT_22_SAFETY_NOTE,
}

export function runtimeExecutionErrorResponse(error: unknown) {
  if (error instanceof RuntimeExecutionApiError) {
    return Response.json({ ok: false, error: { code: 'runtime_execution_error', message: error.message } }, { status: error.status })
  }
  if (error instanceof Error) {
    return Response.json({ ok: false, error: { code: 'validation_error', message: error.message } }, { status: 400 })
  }
  return Response.json({ ok: false, error: { code: 'unexpected_error', message: 'Unexpected Sprint 22 runtime execution API error.' } }, { status: 500 })
}

function runtimeWorkerSecretFrom(request: Request): string | undefined {
  const auth = request.headers.get('authorization')?.trim()
  if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim()
  return request.headers.get('x-runtime-worker-secret')?.trim() || undefined
}

function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function requireRuntimeWorkerAuth(request: Request, workerId: string): void {
  const expectedSecret = process.env.RUNTIME_WORKER_SECRET?.trim()
  if (!expectedSecret) {
    throw new RuntimeExecutionApiError('Runtime worker secret is not configured.', 503)
  }

  const providedSecret = runtimeWorkerSecretFrom(request)
  if (!providedSecret || !sameSecret(providedSecret, expectedSecret)) {
    throw new RuntimeExecutionApiError('Runtime worker authentication is required.', 401)
  }

  const authenticatedWorkerId = request.headers.get('x-runtime-worker-id')?.trim()
  if (!authenticatedWorkerId) {
    throw new RuntimeExecutionApiError('x-runtime-worker-id header is required.', 401)
  }
  if (authenticatedWorkerId !== workerId) {
    throw new RuntimeExecutionApiError('Authenticated runtime worker does not match request workerId.', 403)
  }
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
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function requiredString(value: unknown, name: string): string {
  const s = stringValue(value)
  if (!s) throw new Error(`${name} is required.`)
  return s
}

export function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function planValue(value: unknown): StructuredRuntimeExecutionPlan {
  if (!isObject(value)) throw new Error('plan is required and must be an object.')
  return value as unknown as StructuredRuntimeExecutionPlan
}

export function scopeValue(value: unknown): RuntimeExecutionScope {
  if (!isObject(value)) throw new Error('scope is required and must be an object.')
  return value as unknown as RuntimeExecutionScope
}

export function statusParam(value: string | null): FindRuntimeExecutionQuery['status'] | undefined {
  return value ? (value as RuntimeExecutionTokenStatus | RuntimeDispatchJobStatus) : undefined
}

export function connectorParam(value: string | null): RuntimeExecutionConnectorId | undefined {
  return value ? (value as RuntimeExecutionConnectorId) : undefined
}

export function actionParam(value: string | null): RuntimeExecutionActionType | undefined {
  return value ? (value as RuntimeExecutionActionType) : undefined
}

export function limitParam(value: string | null): number {
  const limit = Number(value ?? 50)
  return Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50
}
