import {
  getRuntimeExecutionReceiptByJobId,
  listRuntimeDispatchAttempts,
  listRuntimeRecoveryPoints,
  RuntimeExecutionApiError,
} from './repository'
import { runRuntimeDispatchJobOnce } from './runner'
import { SPRINT_22_SAFETY_NOTE } from './types'

export interface RuntimeVerifyOnceInput {
  jobId: string
  workerId: string
  leaseDurationMs?: number
  now?: Date
}

export async function verifyRuntimeDispatchJobOnce(input: RuntimeVerifyOnceInput) {
  const jobId = input.jobId.trim()
  const workerId = input.workerId.trim()
  if (!jobId) throw new RuntimeExecutionApiError('jobId is required.')
  if (!workerId) throw new RuntimeExecutionApiError('workerId is required.')

  const run = await runRuntimeDispatchJobOnce({
    jobId,
    workerId,
    mode: 'dry_run',
    leaseDurationMs: input.leaseDurationMs,
    now: input.now,
  })
  const attempts = await listRuntimeDispatchAttempts(jobId)
  const receipt = await getRuntimeExecutionReceiptByJobId(jobId)
  const recovery = await listRuntimeRecoveryPoints(jobId)

  return {
    ok: true,
    jobId,
    workerId,
    mode: 'dry_run' as const,
    run: {
      claimStatus: run.claim.record.status,
      startStatus: run.start.record.status,
      completionStatus: run.completion.record.status,
      receiptStatus: run.completion.receipt.status,
    },
    audit: {
      attempts,
      receipt,
      recovery,
    },
    safetyNote: SPRINT_22_SAFETY_NOTE,
  }
}
