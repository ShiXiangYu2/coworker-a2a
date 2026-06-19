export type TaskLifecyclePhase =
  | 'intake'
  | 'consensus'
  | 'planning'
  | 'execution'
  | 'review'
  | 'repair'

export type TaskLifecycleSource =
  | 'task'
  | 'workflow'
  | 'runtime'
  | 'eval'
  | 'fallback'

export interface DerivedTaskLifecycle {
  phase: TaskLifecyclePhase
  reason: string
  source: TaskLifecycleSource
}

export interface DeriveTaskLifecyclePhaseInput {
  taskStatus?: string | null
  hasWorkflowProposal?: boolean
  hasRuntimeJob?: boolean
  latestRuntimeStatus?: string | null
  hasEvalOrReview?: boolean
  hasBlockedOrFailedExecution?: boolean
}

const LIVE_RUNTIME_STATUSES = new Set(['queued', 'leased', 'running'])
const BLOCKED_RUNTIME_STATUSES = new Set(['blocked', 'failed'])
const REVIEW_TASK_STATUSES = new Set(['review', 'approved_record', 'rejected'])
const CONSENSUS_TASK_STATUSES = new Set(['queued', 'assigned', 'blocked'])

export function deriveTaskLifecyclePhase(input: DeriveTaskLifecyclePhaseInput): DerivedTaskLifecycle {
  const latestRuntimeStatus = input.latestRuntimeStatus?.trim() || null
  const taskStatus = input.taskStatus?.trim() || null

  if (
    input.hasBlockedOrFailedExecution ||
    (latestRuntimeStatus && BLOCKED_RUNTIME_STATUSES.has(latestRuntimeStatus))
  ) {
    return {
      phase: 'repair',
      source: 'runtime',
      reason: 'A blocked or failed runtime record requires repair before further progress.',
    }
  }

  if (input.hasRuntimeJob && latestRuntimeStatus && LIVE_RUNTIME_STATUSES.has(latestRuntimeStatus)) {
    return {
      phase: 'execution',
      source: 'runtime',
      reason: `Latest runtime job is ${latestRuntimeStatus}.`,
    }
  }

  if (input.hasEvalOrReview || (taskStatus && REVIEW_TASK_STATUSES.has(taskStatus))) {
    return {
      phase: 'review',
      source: input.hasEvalOrReview ? 'eval' : 'task',
      reason: 'Review or evaluation evidence is available for this task.',
    }
  }

  if (input.hasWorkflowProposal) {
    return {
      phase: 'planning',
      source: 'workflow',
      reason: 'A workflow or execution plan record exists for this task.',
    }
  }

  if (taskStatus && CONSENSUS_TASK_STATUSES.has(taskStatus)) {
    return {
      phase: 'consensus',
      source: 'task',
      reason: `Task status ${taskStatus} indicates routing or analysis consensus is in progress.`,
    }
  }

  if (taskStatus) {
    return {
      phase: 'intake',
      source: 'task',
      reason: `Task status ${taskStatus} is still in the intake lane.`,
    }
  }

  return {
    phase: 'intake',
    source: 'fallback',
    reason: 'No task, workflow, runtime, or review signal is available yet.',
  }
}
