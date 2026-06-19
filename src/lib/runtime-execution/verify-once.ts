import {
  getRuntimeDispatchJobById,
  getRuntimeExecutionReceiptByJobId,
  listRuntimeDispatchAttempts,
  listRuntimeRecoveryPoints,
  RuntimeExecutionApiError,
} from './repository'
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

  // 获取 job 状态
  const job = await getRuntimeDispatchJobById(jobId)
  if (!job) throw new RuntimeExecutionApiError('Runtime dispatch job not found.', 404)

  // 获取相关记录
  const attempts = await listRuntimeDispatchAttempts(jobId)
  const receipt = await getRuntimeExecutionReceiptByJobId(jobId)
  const recovery = await listRuntimeRecoveryPoints(jobId)

  return {
    ok: true,
    jobId,
    workerId,
    job: {
      id: job.id,
      status: job.status,
      attemptCount: job.attemptCount,
      connectorId: job.connectorId,
      actionType: job.actionType,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    },
    audit: {
      attempts,
      receipt,
      recovery,
    },
    safetyNote: SPRINT_22_SAFETY_NOTE,
  }
}
