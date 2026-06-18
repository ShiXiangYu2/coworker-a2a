/**
 * Loop Engine — 状态追踪
 *
 * 定义自治循环的状态类型、配置和状态机转换。
 * 来源：auto-dev-framework Loop Engineering
 *
 * 安全：LoopState 仅追踪循环元数据，不执行任何任务。
 * 实际任务执行由 loop-engine.ts 调用 agent-runtime 完成。
 */

// ─── 配置 ────────────────────────────────────────────────────────────

export interface LoopConfig {
  /** 最大循环次数（防止无限循环） */
  maxIterations: number
  /** 最大并行任务数 */
  maxConcurrent: number
  /** 单次执行超时（毫秒） */
  timeoutMs: number
  /** 失败重试次数 */
  retryAttempts: number
  /** 失败时是否升级人工 */
  humanGateOnFailure: boolean
}

export const DEFAULT_LOOP_CONFIG: LoopConfig = {
  maxIterations: 10,
  maxConcurrent: 1,
  timeoutMs: 60_000,
  retryAttempts: 2,
  humanGateOnFailure: true,
}

// ─── 状态类型 ────────────────────────────────────────────────────────

export type LoopStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed'

export interface LoopState {
  /** 循环唯一 ID */
  loopId: string
  /** 当前状态 */
  status: LoopStatus
  /** 当前迭代次数 */
  currentIteration: number
  /** 已处理任务数 */
  tasksProcessed: number
  /** 成功任务数 */
  tasksSucceeded: number
  /** 失败任务数 */
  tasksFailed: number
  /** 阻塞任务数 */
  tasksBlocked: number
  /** 连续失败次数（用于检测连续失败终止条件） */
  consecutiveFailures: number
  /** 循环配置 */
  config: LoopConfig
  /** 开始时间 */
  startedAt: string
  /** 最后一次迭代时间 */
  lastIterationAt: string
  /** 完成时间 */
  completedAt?: string
  /** 错误信息 */
  error?: string
  /** 最后一次迭代处理的任务 ID 列表 */
  lastIterationTaskIds: string[]
}

// ─── 事件 ────────────────────────────────────────────────────────────

export type LoopEvent =
  | 'START'
  | 'PAUSE'
  | 'RESUME'
  | 'ITERATION_COMPLETE'
  | 'TASK_SUCCEEDED'
  | 'TASK_FAILED'
  | 'TASK_BLOCKED'
  | 'MAX_ITERATIONS_REACHED'
  | 'NO_READY_TASKS'
  | 'CONSECUTIVE_FAILURES'
  | 'COMPLETE'
  | 'FAIL'

// ─── 状态机 ──────────────────────────────────────────────────────────

const loopTransitions = new Map<string, LoopStatus>([
  ['idle:START', 'running'],
  ['running:PAUSE', 'paused'],
  ['running:COMPLETE', 'completed'],
  ['running:FAIL', 'failed'],
  ['running:MAX_ITERATIONS_REACHED', 'completed'],
  ['running:NO_READY_TASKS', 'completed'],
  ['running:CONSECUTIVE_FAILURES', 'failed'],
  ['paused:RESUME', 'running'],
  ['paused:FAIL', 'failed'],
])

export class InvalidLoopTransitionError extends Error {
  constructor(
    public readonly currentStatus: LoopStatus,
    public readonly event: LoopEvent
  ) {
    super(`Invalid Loop transition: ${currentStatus} -> ${event}`)
    this.name = 'InvalidLoopTransitionError'
  }
}

export function transitionLoopState(
  currentStatus: LoopStatus,
  event: LoopEvent
): LoopStatus {
  const next = loopTransitions.get(`${currentStatus}:${event}`)
  if (!next) {
    throw new InvalidLoopTransitionError(currentStatus, event)
  }
  return next
}

export function canTransitionLoopState(
  currentStatus: LoopStatus,
  event: LoopEvent
): boolean {
  try {
    transitionLoopState(currentStatus, event)
    return true
  } catch {
    return false
  }
}

// ─── 辅助函数 ────────────────────────────────────────────────────────

export function createInitialLoopState(
  loopId: string,
  config: LoopConfig = DEFAULT_LOOP_CONFIG
): LoopState {
  const now = new Date().toISOString()
  return {
    loopId,
    status: 'idle',
    currentIteration: 0,
    tasksProcessed: 0,
    tasksSucceeded: 0,
    tasksFailed: 0,
    tasksBlocked: 0,
    consecutiveFailures: 0,
    config,
    startedAt: now,
    lastIterationAt: now,
    lastIterationTaskIds: [],
  }
}

/**
 * 检查循环是否应该终止
 */
export function shouldTerminate(state: LoopState): { terminate: boolean; reason?: LoopEvent } {
  // 达到最大迭代数
  if (state.currentIteration >= state.config.maxIterations) {
    return { terminate: true, reason: 'MAX_ITERATIONS_REACHED' }
  }

  // 连续失败达到阈值
  if (state.consecutiveFailures >= 3) {
    return { terminate: true, reason: 'CONSECUTIVE_FAILURES' }
  }

  return { terminate: false }
}
