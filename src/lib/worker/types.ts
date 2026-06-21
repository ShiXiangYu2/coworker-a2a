/**
 * Sprint 23 - Worker Daemon 类型定义
 *
 * 定义 Worker Daemon 所需的接口、联合类型和常量。
 * 与 prisma/schema.prisma 中的 WorkerInstance、TaskQueueJob、WorkerHeartbeat 模型对齐。
 */

// ─── 联合类型 ──────────────────────────────────────────────────

/** Worker 能力标识 */
export type WorkerCapability =
  | 'sandbox'     // 沙箱命令执行（test, lint, typecheck 等）
  | 'git'         // Git 操作（commit, push, PR 等）
  | 'api'         // 外部 API 调用
  | 'deploy'      // 部署操作
  | 'obsidian'    // Obsidian 写入
  | 'database'    // 数据库操作

/** Worker 状态 */
export type WorkerStatus =
  | 'online'      // 在线，可接受任务
  | 'offline'     // 离线
  | 'draining'    // 排空中，等待当前任务完成

/** 任务队列状态 */
export type QueueJobStatus =
  | 'pending'     // 等待认领
  | 'assigned'    // 已认领，待执行
  | 'running'     // 执行中
  | 'completed'   // 完成
  | 'failed'      // 失败
  | 'blocked'     // 权限或治理边界阻塞，需人工介入
  | 'dead_letter' // 死信（重试耗尽）

/** 任务优先级 */
export type QueuePriority = 0 | 1 | 2 | 3

/** 心跳状态 */
export type HeartbeatStatus =
  | 'idle'        // 空闲
  | 'busy'        // 忙碌
  | 'draining'    // 排空中

// ─── 接口定义 ──────────────────────────────────────────────────

/** Worker 配置 */
export interface WorkerConfig {
  /** Worker 唯一标识 */
  workerId: string
  /** 声明的能力列表 */
  capabilities: WorkerCapability[]
  /** 最大并发任务数 */
  maxConcurrent: number
  /** 扫描间隔（毫秒） */
  pollIntervalMs: number
  /** 心跳间隔（毫秒） */
  heartbeatIntervalMs: number
  /** Lease 时长（毫秒） */
  leaseDurationMs: number
  /** 单任务超时（毫秒） */
  jobTimeoutMs: number
  /** Runtime 执行模式：默认 dry_run，真实 Obsidian 写入必须显式开启 */
  runtimeMode?: 'dry_run' | 'obsidian_write'
  /** 是否允许真实低风险连接器执行；只有 runtimeMode=obsidian_write 且 true 时生效 */
  executeRealConnectors?: boolean
  /** Obsidian vault 根目录，用于显式真实写入 */
  vaultPath?: string
}

/** Worker 运行时状态 */
export interface WorkerRuntimeState {
  /** Worker 配置 */
  config: WorkerConfig
  /** 当前状态 */
  status: WorkerStatus
  /** 当前正在执行的任务 ID */
  activeJobIds: Set<string>
  /** 今日完成数 */
  completedToday: number
  /** 今日失败数 */
  failedToday: number
  /** 平均执行时长（毫秒） */
  avgDurationMs: number
  /** 是否正在关闭 */
  isShuttingDown: boolean
}

/** 任务队列记录（从数据库读取） */
export interface QueueJobRecord {
  id: string
  idempotencyKey: string | null
  taskId: string
  correlationId: string
  priority: number
  status: QueueJobStatus
  requiredCapabilities: string[]
  requiredAgentRoles: string[]
  maxRetries: number
  retryCount: number
  timeoutMs: number
  scheduledAt: Date
  assignedWorkerId: string | null
  leaseExpiresAt: Date | null
  lastError: Record<string, unknown> | null
  attemptCount: number
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/** 任务执行结果 */
export interface JobExecutionResult {
  /** 执行状态 */
  status: 'completed' | 'failed' | 'needs_review'
  /** 执行摘要 */
  summary: string
  /** 交付物列表 */
  deliverables: unknown[]
  /** 执行耗时（毫秒） */
  durationMs: number
  /** 错误信息（失败时） */
  error?: string
}

/** Worker 事件（用于审计和监控） */
export type WorkerEvent =
  | { type: 'worker_started'; workerId: string; capabilities: string[]; timestamp: Date }
  | { type: 'worker_stopping'; workerId: string; reason: string; timestamp: Date }
  | { type: 'worker_stopped'; workerId: string; timestamp: Date }
  | { type: 'job_leased'; workerId: string; jobId: string; taskId: string; timestamp: Date }
  | { type: 'job_started'; workerId: string; jobId: string; timestamp: Date }
  | {
      type: 'job_completed'
      workerId: string
      jobId: string
      queueJobId: string
      runtimeJobId?: string
      receiptId?: string
      receiptStatus?: string
      durationMs: number
      timestamp: Date
    }
  | { type: 'job_failed'; workerId: string; jobId: string; error: string; timestamp: Date }
  | { type: 'job_blocked'; workerId: string; jobId: string; reason: string; timestamp: Date }
  | { type: 'job_requeued'; workerId: string; jobId: string; retryCount: number; timestamp: Date }
  | { type: 'job_dead_lettered'; workerId: string; jobId: string; reason: string; timestamp: Date }
  | { type: 'heartbeat'; workerId: string; status: HeartbeatStatus; metrics: Record<string, unknown>; timestamp: Date }
  | { type: 'lease_reclaimed'; jobId: string; previousWorkerId: string; timestamp: Date }

// ─── 查询接口 ──────────────────────────────────────────────────

/** 查找待认领任务的查询参数 */
export interface FindPendingJobsQuery {
  /** Worker 能力列表 */
  capabilities: WorkerCapability[]
  /** 返回数量限制 */
  limit: number
  /** 当前时间（用于测试） */
  now?: Date
}

/** 认领任务的参数 */
export interface LeaseJobInput {
  /** 任务 ID */
  jobId: string
  /** Worker ID */
  workerId: string
  /** Lease 时长（毫秒） */
  leaseDurationMs: number
  /** 当前时间（用于测试） */
  now?: Date
}

/** 完成任务的参数 */
export interface CompleteJobInput {
  /** 任务 ID */
  jobId: string
  /** 执行结果 */
  result: JobExecutionResult
  /** 当前时间（用于测试） */
  now?: Date
}

/** 重新入队的参数 */
export interface RequeueJobInput {
  /** 任务 ID */
  jobId: string
  /** 新的重试次数 */
  retryCount: number
  /** 最后错误信息 */
  lastError: Record<string, unknown>
  /** 当前时间（用于测试） */
  now?: Date
}

/** 死信队列的参数 */
export interface DeadLetterJobInput {
  /** 任务 ID */
  jobId: string
  /** 最后错误信息 */
  lastError: Record<string, unknown>
  /** 当前时间（用于测试） */
  now?: Date
}

/** 注册 Worker 的参数 */
export interface RegisterWorkerInput {
  /** Worker ID */
  workerId: string
  /** 能力列表 */
  capabilities: WorkerCapability[]
  /** 最大并发数 */
  maxConcurrent: number
  /** 当前时间（用于测试） */
  now?: Date
}

/** 更新心跳的参数 */
export interface UpdateHeartbeatInput {
  /** Worker ID */
  workerId: string
  /** 心跳状态 */
  status: HeartbeatStatus
  /** 当前任务 ID */
  jobId?: string
  /** 运行指标 */
  metrics: Record<string, unknown>
  /** 当前时间（用于测试） */
  now?: Date
}

// ─── 常量数组 ──────────────────────────────────────────────────

export const WORKER_CAPABILITIES: readonly WorkerCapability[] = [
  'sandbox',
  'git',
  'api',
  'deploy',
  'obsidian',
  'database',
]

export const WORKER_STATUSES: readonly WorkerStatus[] = [
  'online',
  'offline',
  'draining',
]

export const QUEUE_JOB_STATUSES: readonly QueueJobStatus[] = [
  'pending',
  'assigned',
  'running',
  'completed',
  'failed',
  'blocked',
  'dead_letter',
]

export const QUEUE_PRIORITIES: readonly QueuePriority[] = [
  0,  // 紧急
  1,  // 高
  2,  // 普通
  3,  // 低
]

export const HEARTBEAT_STATUSES: readonly HeartbeatStatus[] = [
  'idle',
  'busy',
  'draining',
]

// ─── 默认配置 ──────────────────────────────────────────────────

/** 默认 Worker 配置 */
export const DEFAULT_WORKER_CONFIG: Omit<WorkerConfig, 'workerId'> = {
  capabilities: ['sandbox'],
  maxConcurrent: 1,
  pollIntervalMs: 5000,
  heartbeatIntervalMs: 30000,
  leaseDurationMs: 120000,
  jobTimeoutMs: 60000,
}

// ─── 安全边界 ──────────────────────────────────────────────────

export const SPRINT_23_SAFETY_NOTE =
  'Sprint 23 Worker Daemon provides asynchronous task execution infrastructure. Workers can only execute tasks matching their declared capabilities. High-risk operations require Kelvin approval through existing governance boundaries. All worker actions are audited.'
