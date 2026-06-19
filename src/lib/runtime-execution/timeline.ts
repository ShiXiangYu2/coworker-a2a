import {
  getRuntimeDispatchJobById,
  getRuntimeExecutionReceiptByJobId,
  getRuntimeExecutionTokenById,
  listRuntimeDispatchAttempts,
  listRuntimeRecoveryPoints,
  RuntimeExecutionApiError,
} from './repository'
import type { RuntimeDispatchJobTimelineReadModel } from './read-models'
import { SPRINT_22_SAFETY_NOTE } from './types'

const TERMINAL_JOB_STATUSES = new Set(['succeeded', 'failed', 'blocked', 'cancelled'])

export async function getRuntimeDispatchJobTimeline(jobId: string): Promise<RuntimeDispatchJobTimelineReadModel> {
  const normalizedJobId = jobId.trim()
  if (!normalizedJobId) throw new RuntimeExecutionApiError('jobId is required.')

  const job = await getRuntimeDispatchJobById(normalizedJobId)
  if (!job) throw new RuntimeExecutionApiError('Runtime dispatch job not found.', 404)

  const [token, attempts, receipt, recovery] = await Promise.all([
    getRuntimeExecutionTokenById(job.runtimeTokenId),
    listRuntimeDispatchAttempts(normalizedJobId),
    getRuntimeExecutionReceiptByJobId(normalizedJobId),
    listRuntimeRecoveryPoints(normalizedJobId),
  ])

  const now = Date.now()
  const leaseExpiresAt = job.leaseExpiresAt ? new Date(job.leaseExpiresAt).getTime() : null
  const leaseActive = Boolean(
    job.leaseOwner &&
    leaseExpiresAt &&
    Number.isFinite(leaseExpiresAt) &&
    leaseExpiresAt > now &&
    (job.status === 'leased' || job.status === 'running')
  )

  return {
    job,
    token,
    attempts,
    receipt,
    recovery,
    derived: {
      hasReceipt: Boolean(receipt),
      receiptStatus: receipt?.status ?? null,
      attemptCount: attempts.length,
      recoveryCount: recovery.length,
      isTerminal: TERMINAL_JOB_STATUSES.has(job.status),
      leaseActive,
      issuedRuntimeTokenActive: Boolean(job.runtimeTokenId && token?.status === 'active'),
      awaitingRuntimeExecution: job.status === 'queued' && !receipt,
    },
    safetyNote: SPRINT_22_SAFETY_NOTE,
  }
}
