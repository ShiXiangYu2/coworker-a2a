import type {
  getRuntimeDispatchJobById,
  getRuntimeExecutionReceiptByJobId,
  getRuntimeExecutionTokenById,
  listRuntimeDispatchAttempts,
  listRuntimeRecoveryPoints,
} from './repository'

export interface RuntimeDispatchJobTimelineDerivedReadModel {
  hasReceipt: boolean
  receiptStatus: string | null
  attemptCount: number
  recoveryCount: number
  isTerminal: boolean
  leaseActive: boolean
}

export interface RuntimeDispatchJobTimelineReadModel {
  job: Awaited<ReturnType<typeof getRuntimeDispatchJobById>>
  token: Awaited<ReturnType<typeof getRuntimeExecutionTokenById>>
  attempts: Awaited<ReturnType<typeof listRuntimeDispatchAttempts>>
  receipt: Awaited<ReturnType<typeof getRuntimeExecutionReceiptByJobId>>
  recovery: Awaited<ReturnType<typeof listRuntimeRecoveryPoints>>
  derived: RuntimeDispatchJobTimelineDerivedReadModel
  safetyNote: string
}

export interface TaskRuntimeExecutionSummaryCountsReadModel {
  total: number
  queued: number
  leased: number
  running: number
  succeeded: number
  failed: number
  blocked: number
  cancelled: number
}

export interface TaskRuntimeExecutionSummaryReceiptsReadModel {
  dryRunCount: number
  succeededCount: number
}

export interface TaskRuntimeExecutionSummaryDerivedReadModel {
  hasAnyLiveJob: boolean
  hasAnySucceededJob: boolean
  latestJobId: string | null
}

export interface TaskRuntimeExecutionSummaryReadModel {
  taskId: string
  taskStatus?: string | null
  hasWorkflowProposal: boolean
  hasEvalOrReview: boolean
  jobs: RuntimeDispatchJobTimelineReadModel[]
  counts: TaskRuntimeExecutionSummaryCountsReadModel
  receipts: TaskRuntimeExecutionSummaryReceiptsReadModel
  derived: TaskRuntimeExecutionSummaryDerivedReadModel
  safetyNote: string
}
