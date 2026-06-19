import { listRuntimeDispatchJobs, RuntimeExecutionApiError } from './repository'
import type {
  TaskRuntimeExecutionSummaryCountsReadModel,
  TaskRuntimeExecutionSummaryReadModel,
  TaskRuntimeExecutionSummaryReceiptsReadModel,
} from './read-models'
import { getRuntimeDispatchJobTimeline } from './timeline'
import { SPRINT_22_SAFETY_NOTE } from './types'
import { getTaskBundle } from '@/lib/harmony/repository'

const LIVE_JOB_STATUSES = new Set(['queued', 'leased', 'running'])

function emptyCounts(): TaskRuntimeExecutionSummaryCountsReadModel {
  return {
    total: 0,
    queued: 0,
    leased: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
    blocked: 0,
    cancelled: 0,
  }
}

function timeValue(value: unknown): number {
  if (!value) return 0
  const time = new Date(value as string | Date).getTime()
  return Number.isFinite(time) ? time : 0
}

export async function getTaskRuntimeExecutionSummary(taskId: string): Promise<TaskRuntimeExecutionSummaryReadModel> {
  const normalizedTaskId = taskId.trim()
  if (!normalizedTaskId) throw new RuntimeExecutionApiError('taskId is required.')

  const taskBundle = await getTaskBundle(normalizedTaskId)
  const records = await listRuntimeDispatchJobs({ taskId: normalizedTaskId, limit: 100 })
  const jobs = await Promise.all(records.map((job) => getRuntimeDispatchJobTimeline(job.id)))
  const counts = emptyCounts()
  const receipts: TaskRuntimeExecutionSummaryReceiptsReadModel = {
    dryRunCount: 0,
    succeededCount: 0,
  }

  let latestJobId: string | null = null
  let latestJobTime = 0

  for (const timeline of jobs) {
    const status = timeline.job?.status
    counts.total += 1
    if (status && status in counts && status !== 'total') {
      counts[status as keyof Omit<TaskRuntimeExecutionSummaryCountsReadModel, 'total'>] += 1
    }
    if (timeline.receipt?.status === 'dry_run') receipts.dryRunCount += 1
    if (timeline.receipt?.status === 'succeeded') receipts.succeededCount += 1

    const updatedAt = timeValue(timeline.job?.updatedAt)
    const createdAt = timeValue(timeline.job?.createdAt)
    const candidateTime = Math.max(updatedAt, createdAt)
    if (!latestJobId || candidateTime >= latestJobTime) {
      latestJobId = timeline.job?.id ?? latestJobId
      latestJobTime = candidateTime
    }
  }

  return {
    taskId: normalizedTaskId,
    taskStatus: taskBundle?.task?.status ?? null,
    hasWorkflowProposal: false,
    hasEvalOrReview: false,
    jobs,
    counts,
    receipts,
    derived: {
      hasAnyLiveJob: jobs.some((timeline) => Boolean(timeline.job?.status && LIVE_JOB_STATUSES.has(timeline.job.status))),
      hasAnySucceededJob: counts.succeeded > 0,
      latestJobId,
    },
    safetyNote: SPRINT_22_SAFETY_NOTE,
  }
}
