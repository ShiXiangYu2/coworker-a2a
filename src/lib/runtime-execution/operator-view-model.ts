import type {
  RuntimeDispatchJobTimelineReadModel,
  TaskRuntimeExecutionSummaryReadModel,
} from './read-models'
import { getTaskRuntimeExecutionSummary } from './task-summary'

export interface RuntimeOperatorStatusBands {
  live: RuntimeDispatchJobTimelineReadModel[]
  succeeded: RuntimeDispatchJobTimelineReadModel[]
  blocked: RuntimeDispatchJobTimelineReadModel[]
  failed: RuntimeDispatchJobTimelineReadModel[]
}

export interface RuntimeOperatorHighlight {
  primaryStatus: string
  latestJobId: string | null
  latestReceiptStatus: string | null
  hasActionableLiveJob: boolean
}

export interface RuntimeOperatorTaskViewModel {
  taskId: string
  summary: TaskRuntimeExecutionSummaryReadModel
  latestJob: RuntimeDispatchJobTimelineReadModel | null
  latestReceipt: RuntimeDispatchJobTimelineReadModel['receipt']
  jobs: RuntimeDispatchJobTimelineReadModel[]
  statusBands: RuntimeOperatorStatusBands
  highlight: RuntimeOperatorHighlight
  safetyNote: string
}

const LIVE_JOB_STATUSES = new Set(['queued', 'leased', 'running'])

function primaryStatusFrom(summary: TaskRuntimeExecutionSummaryReadModel): string {
  if (summary.counts.failed > 0) return 'failed'
  if (summary.counts.blocked > 0) return 'blocked'
  if (summary.counts.running > 0) return 'running'
  if (summary.counts.leased > 0) return 'leased'
  if (summary.counts.queued > 0) return 'queued'
  if (summary.counts.succeeded > 0) return 'succeeded'
  return 'empty'
}

export async function buildRuntimeOperatorTaskViewModel(taskId: string): Promise<RuntimeOperatorTaskViewModel> {
  const summary = await getTaskRuntimeExecutionSummary(taskId)
  const latestJob = summary.derived.latestJobId
    ? summary.jobs.find((timeline) => timeline.job?.id === summary.derived.latestJobId) ?? null
    : null
  const statusBands: RuntimeOperatorStatusBands = {
    live: summary.jobs.filter((timeline) => Boolean(timeline.job?.status && LIVE_JOB_STATUSES.has(timeline.job.status))),
    succeeded: summary.jobs.filter((timeline) => timeline.job?.status === 'succeeded'),
    blocked: summary.jobs.filter((timeline) => timeline.job?.status === 'blocked'),
    failed: summary.jobs.filter((timeline) => timeline.job?.status === 'failed'),
  }

  return {
    taskId: summary.taskId,
    summary,
    latestJob,
    latestReceipt: latestJob?.receipt ?? null,
    jobs: summary.jobs,
    statusBands,
    highlight: {
      primaryStatus: primaryStatusFrom(summary),
      latestJobId: summary.derived.latestJobId,
      latestReceiptStatus: latestJob?.receipt?.status ?? null,
      hasActionableLiveJob: statusBands.live.some((timeline) => !timeline.derived.hasReceipt),
    },
    safetyNote: summary.safetyNote,
  }
}
