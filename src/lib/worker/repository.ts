/**
 * Sprint 23 - Worker Daemon 数据仓库
 *
 * 实现 TaskQueueJob、WorkerInstance、WorkerHeartbeat 的数据库操作层。
 * 与 prisma/schema.prisma 中的模型对齐。
 */

import { prisma } from '@/lib/prisma'
import type {
  CompleteJobInput,
  DeadLetterJobInput,
  FindPendingJobsQuery,
  LeaseJobInput,
  QueueJobRecord,
  QueueJobStatus,
  RequeueJobInput,
  RegisterWorkerInput,
  UpdateHeartbeatInput,
} from './types'

// ─── 错误类 ────────────────────────────────────────────────────

export class WorkerRepositoryError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message)
    this.name = 'WorkerRepositoryError'
  }
}

// ─── 工具函数 ──────────────────────────────────────────────────

function toJson(value: unknown): string {
  return JSON.stringify(value)
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function toQueueJobRecord(row: {
  id: string
  idempotencyKey: string | null
  taskId: string
  correlationId: string
  priority: number
  status: string
  requiredCapabilitiesJson: string
  requiredAgentRolesJson: string
  maxRetries: number
  retryCount: number
  timeoutMs: number
  scheduledAt: Date
  assignedWorkerId: string | null
  leaseExpiresAt: Date | null
  lastErrorJson: string | null
  attemptCount: number
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): QueueJobRecord {
  return {
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    taskId: row.taskId,
    correlationId: row.correlationId,
    priority: row.priority,
    status: row.status as QueueJobStatus,
    requiredCapabilities: parseJson<string[]>(row.requiredCapabilitiesJson, []),
    requiredAgentRoles: parseJson<string[]>(row.requiredAgentRolesJson, []),
    maxRetries: row.maxRetries,
    retryCount: row.retryCount,
    timeoutMs: row.timeoutMs,
    scheduledAt: row.scheduledAt,
    assignedWorkerId: row.assignedWorkerId,
    leaseExpiresAt: row.leaseExpiresAt,
    lastError: parseJson<Record<string, unknown> | null>(row.lastErrorJson, null),
    attemptCount: row.attemptCount,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// ─── TaskQueueJob 操作 ─────────────────────────────────────────

/**
 * 入队任务
 * 支持幂等键防重复入队
 */
export async function createTaskQueueJob(input: {
  taskId: string
  correlationId: string
  priority?: number
  requiredCapabilities?: string[]
  requiredAgentRoles?: string[]
  maxRetries?: number
  timeoutMs?: number
  scheduledAt?: Date
  idempotencyKey?: string
  now?: Date
}): Promise<{ record: QueueJobRecord }> {
  const now = input.now ?? new Date()
  const idempotencyKey = input.idempotencyKey ?? null

  // 幂等键检查
  if (idempotencyKey) {
    const existing = await prisma.taskQueueJob.findUnique({
      where: { idempotencyKey },
    })
    if (existing) {
      return { record: toQueueJobRecord(existing) }
    }
  }

  const record = await prisma.taskQueueJob.create({
    data: {
      taskId: input.taskId,
      correlationId: input.correlationId,
      priority: input.priority ?? 2,
      status: 'pending',
      requiredCapabilitiesJson: toJson(input.requiredCapabilities ?? []),
      requiredAgentRolesJson: toJson(input.requiredAgentRoles ?? []),
      maxRetries: input.maxRetries ?? 3,
      retryCount: 0,
      timeoutMs: input.timeoutMs ?? 60000,
      scheduledAt: input.scheduledAt ?? now,
      attemptCount: 0,
      idempotencyKey,
    },
  })

  return { record: toQueueJobRecord(record) }
}

/**
 * 查询待认领任务
 * 按优先级排序，匹配 Worker capabilities
 */
export async function findPendingJobs(
  query: FindPendingJobsQuery
): Promise<QueueJobRecord[]> {
  const now = query.now ?? new Date()

  // 查询 pending 任务，按优先级升序（0 最高），然后按 scheduledAt 升序
  const rows = await prisma.taskQueueJob.findMany({
    where: {
      status: 'pending',
      scheduledAt: { lte: now },
    },
    orderBy: [
      { priority: 'asc' },
      { scheduledAt: 'asc' },
    ],
    take: query.limit * 2, // 多取一些，后续过滤 capabilities
  })

  // 过滤：requiredCapabilities 必须是 Worker capabilities 的子集
  const filtered = rows.filter((row) => {
    const required = parseJson<string[]>(row.requiredCapabilitiesJson, [])
    if (required.length === 0) return true // 无能力要求，任何 Worker 都可以
    return required.every((cap) => (query.capabilities as string[]).includes(cap))
  })

  return filtered.slice(0, query.limit).map(toQueueJobRecord)
}

/**
 * CAS 原子认领任务
 * 使用 WHERE status='pending' 防止重复认领
 */
export async function tryLeaseJob(
  input: LeaseJobInput
): Promise<QueueJobRecord | null> {
  const now = input.now ?? new Date()
  const leaseExpiresAt = new Date(now.getTime() + input.leaseDurationMs)

  // CAS 更新：只有 status='pending' 才能认领
  const result = await prisma.taskQueueJob.updateMany({
    where: {
      id: input.jobId,
      status: 'pending',
    },
    data: {
      status: 'assigned',
      assignedWorkerId: input.workerId,
      leaseExpiresAt,
      attemptCount: { increment: 1 },
    },
  })

  if (result.count === 0) {
    return null // 被其他 Worker 抢走了
  }

  // 读取更新后的记录
  const record = await prisma.taskQueueJob.findUnique({
    where: { id: input.jobId },
  })

  return record ? toQueueJobRecord(record) : null
}

/**
 * 更新任务状态
 */
export async function updateJobStatus(
  jobId: string,
  status: QueueJobStatus,
  now?: Date
): Promise<void> {
  await prisma.taskQueueJob.update({
    where: { id: jobId },
    data: {
      status,
      ...(status === 'running' ? { startedAt: now ?? new Date() } : {}),
      ...(status === 'completed' || status === 'failed' || status === 'dead_letter'
        ? { completedAt: now ?? new Date() }
        : {}),
    },
  })
}

/**
 * 标记任务完成
 */
export async function completeJob(
  input: CompleteJobInput
): Promise<{ record: QueueJobRecord }> {
  const now = input.now ?? new Date()

  const record = await prisma.taskQueueJob.update({
    where: { id: input.jobId },
    data: {
      status: 'completed',
      completedAt: now,
      lastErrorJson: null,
    },
  })

  return { record: toQueueJobRecord(record) }
}

/**
 * 标记任务失败
 */
export async function failJob(
  jobId: string,
  error: Record<string, unknown>,
  now?: Date
): Promise<{ record: QueueJobRecord }> {
  const currentTime = now ?? new Date()

  const record = await prisma.taskQueueJob.update({
    where: { id: jobId },
    data: {
      status: 'failed',
      completedAt: currentTime,
      lastErrorJson: toJson(error),
    },
  })

  return { record: toQueueJobRecord(record) }
}

/**
 * 标记任务阻塞
 * 权限、审批、scope 或 runtime token gate 失败时使用；不自动重试。
 */
export async function blockJob(
  jobId: string,
  reason: Record<string, unknown>,
  now?: Date
): Promise<{ record: QueueJobRecord }> {
  const currentTime = now ?? new Date()

  const record = await prisma.taskQueueJob.update({
    where: { id: jobId },
    data: {
      status: 'blocked',
      completedAt: currentTime,
      assignedWorkerId: null,
      leaseExpiresAt: null,
      lastErrorJson: toJson(reason),
    },
  })

  return { record: toQueueJobRecord(record) }
}

/**
 * 重新入队任务
 * retryCount++，状态恢复为 pending
 */
export async function requeueJob(
  input: RequeueJobInput
): Promise<{ record: QueueJobRecord }> {
  const now = input.now ?? new Date()

  const record = await prisma.taskQueueJob.update({
    where: { id: input.jobId },
    data: {
      status: 'pending',
      retryCount: input.retryCount,
      assignedWorkerId: null,
      leaseExpiresAt: null,
      lastErrorJson: toJson(input.lastError),
      scheduledAt: now, // 立即重新调度
    },
  })

  return { record: toQueueJobRecord(record) }
}

/**
 * 死信队列
 * 重试耗尽，不再自动执行
 */
export async function deadLetterJob(
  input: DeadLetterJobInput
): Promise<{ record: QueueJobRecord }> {
  const now = input.now ?? new Date()

  const record = await prisma.taskQueueJob.update({
    where: { id: input.jobId },
    data: {
      status: 'dead_letter',
      completedAt: now,
      assignedWorkerId: null,
      leaseExpiresAt: null,
      lastErrorJson: toJson(input.lastError),
    },
  })

  return { record: toQueueJobRecord(record) }
}

/**
 * 超时回收
 * 检测过期 Lease，重新入队或进入死信
 */
export async function reclaimExpiredLeases(now?: Date): Promise<{
  reclaimed: number
  deadLettered: number
  jobIds: string[]
}> {
  const currentTime = now ?? new Date()

  // 查找过期的 Lease
  const expiredJobs = await prisma.taskQueueJob.findMany({
    where: {
      status: { in: ['assigned', 'running'] },
      leaseExpiresAt: { lt: currentTime },
    },
  })

  let reclaimed = 0
  let deadLettered = 0
  const jobIds: string[] = []

  for (const job of expiredJobs) {
    jobIds.push(job.id)

    if (job.retryCount < job.maxRetries) {
      // 重新入队
      await requeueJob({
        jobId: job.id,
        retryCount: job.retryCount + 1,
        lastError: {
          message: 'Lease expired, requeued by reaper',
          previousWorkerId: job.assignedWorkerId,
          expiredAt: currentTime.toISOString(),
        },
        now: currentTime,
      })
      reclaimed++
    } else {
      // 进入死信
      await deadLetterJob({
        jobId: job.id,
        lastError: {
          message: 'Lease expired and max retries exhausted',
          previousWorkerId: job.assignedWorkerId,
          expiredAt: currentTime.toISOString(),
          retriesExhausted: true,
        },
        now: currentTime,
      })
      deadLettered++
    }
  }

  return { reclaimed, deadLettered, jobIds }
}

// ─── WorkerInstance 操作 ───────────────────────────────────────

/**
 * 注册 Worker（upsert）
 */
export async function registerWorker(
  input: RegisterWorkerInput
): Promise<void> {
  const now = input.now ?? new Date()

  await prisma.workerInstance.upsert({
    where: { workerId: input.workerId },
    create: {
      id: input.workerId,
      workerId: input.workerId,
      status: 'online',
      capabilitiesJson: toJson(input.capabilities),
      maxConcurrent: input.maxConcurrent,
      lastHeartbeatAt: now,
      startedAt: now,
    },
    update: {
      status: 'online',
      capabilitiesJson: toJson(input.capabilities),
      maxConcurrent: input.maxConcurrent,
      lastHeartbeatAt: now,
      stoppedAt: null,
    },
  })
}

/**
 * 注销 Worker
 */
export async function deregisterWorker(
  workerId: string,
  now?: Date
): Promise<void> {
  const currentTime = now ?? new Date()

  await prisma.workerInstance.update({
    where: { workerId },
    data: {
      status: 'offline',
      stoppedAt: currentTime,
    },
  })
}

/**
 * 查询在线 Worker
 */
export async function findOnlineWorkers(): Promise<{
  id: string
  workerId: string
  status: string
  capabilities: string[]
  maxConcurrent: number
  currentJobId: string | null
  lastHeartbeatAt: Date
  startedAt: Date
}[]> {
  const rows = await prisma.workerInstance.findMany({
    where: { status: 'online' },
    orderBy: { lastHeartbeatAt: 'desc' },
  })

  return rows.map((row) => ({
    id: row.id,
    workerId: row.workerId,
    status: row.status,
    capabilities: parseJson<string[]>(row.capabilitiesJson, []),
    maxConcurrent: row.maxConcurrent,
    currentJobId: row.currentJobId,
    lastHeartbeatAt: row.lastHeartbeatAt,
    startedAt: row.startedAt,
  }))
}

// ─── WorkerHeartbeat 操作 ──────────────────────────────────────

/**
 * 插入心跳记录
 */
export async function updateHeartbeat(
  input: UpdateHeartbeatInput
): Promise<void> {
  const now = input.now ?? new Date()

  // 插入心跳记录
  await prisma.workerHeartbeat.create({
    data: {
      workerId: input.workerId,
      jobId: input.jobId ?? null,
      status: input.status,
      metricsJson: toJson(input.metrics),
      createdAt: now,
    },
  })

  // 更新 WorkerInstance 的 lastHeartbeatAt
  await prisma.workerInstance.update({
    where: { workerId: input.workerId },
    data: { lastHeartbeatAt: now },
  })
}

// ─── 审计日志 ──────────────────────────────────────────────────

/**
 * 写入 Worker 审计事件
 */
export async function createWorkerAuditEvent(input: {
  correlationId: string
  eventType: string
  actorId: string
  reason: string
  payload?: Record<string, unknown>
}): Promise<void> {
  await prisma.harmonyAuditEvent.create({
    data: {
      correlationId: input.correlationId,
      eventType: input.eventType,
      actorType: 'worker_daemon',
      actorId: input.actorId,
      reason: input.reason,
      payloadJson: input.payload ? toJson(input.payload) : null,
    },
  })
}
