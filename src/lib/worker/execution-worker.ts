/**
 * Sprint 23 - ExecutionWorker 核心类
 *
 * 持续运行的 Worker Daemon，负责：
 * - 扫描任务队列
 * - 认领 pending 任务
 * - 异步执行任务
 * - 上报执行结果
 * - 心跳上报
 * - 超时回收
 *
 * 安全边界：
 * - Worker 只能执行声明的能力范围内的操作
 * - 高风险操作需要 Kelvin 批准
 * - 所有操作写入审计日志
 */

import type {
  HeartbeatStatus,
  JobExecutionResult,
  QueueJobRecord,
  WorkerConfig,
  WorkerEvent,
  WorkerRuntimeState,
} from './types'
import { SPRINT_23_SAFETY_NOTE } from './types'
import {
  blockJob,
  completeJob,
  createWorkerAuditEvent,
  deadLetterJob,
  deregisterWorker,
  findPendingJobs,
  registerWorker,
  requeueJob,
  reclaimExpiredLeases,
  tryLeaseJob,
  updateHeartbeat,
  updateJobStatus,
} from './repository'
import {
  listRuntimeDispatchJobs,
  runRuntimeDispatchJobOnce,
  RuntimeExecutionApiError,
} from '@/lib/runtime-execution'
import { prisma } from '@/lib/prisma'
import { canTransitionHarmonyTask, transitionHarmonyTask } from '@/lib/harmony/state-machine'
import { isHarmonyTaskStatus, type HarmonyTaskStatus } from '@/lib/harmony/types'

// ─── Runtime 执行器 ───────────────────────────────────────────

/**
 * Worker 阻塞错误。
 * 用于权限、scope、token gate、缺少 approved runtime job 等不可自动重试场景。
 */
export class WorkerJobBlockedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkerJobBlockedError'
  }
}

interface RuntimeQueueExecutionOptions {
  workerId: string
  leaseDurationMs: number
  mode?: 'dry_run' | 'obsidian_write'
  executeRealConnectors?: boolean
  vaultPath?: string
  now?: Date
}

function runtimeDeliverableFrom(result: JobExecutionResult): {
  runtimeJobId?: string
  receiptId?: string
  receiptStatus?: string
} {
  const first = result.deliverables[0]
  if (!first || typeof first !== 'object' || Array.isArray(first)) return {}
  const record = first as Record<string, unknown>
  return {
    runtimeJobId: typeof record.runtimeJobId === 'string' ? record.runtimeJobId : undefined,
    receiptId: typeof record.receiptId === 'string' ? record.receiptId : undefined,
    receiptStatus: typeof record.receiptStatus === 'string' ? record.receiptStatus : undefined,
  }
}

function isBlockingRuntimeError(error: unknown): boolean {
  if (error instanceof WorkerJobBlockedError) return true
  if (error instanceof RuntimeExecutionApiError) return error.status === 400 || error.status === 404 || error.status === 409
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status
    return status === 400 || status === 404 || status === 409
  }
  return false
}

async function advanceHarmonyTaskFromRuntimeReceipt(input: {
  taskId: string
  receiptStatus: string
  receiptId?: string
  runtimeJobId: string
  correlationId: string
  workerId: string
}): Promise<void> {
  const task = await prisma.harmonyTask.findUnique({
    where: { id: input.taskId },
    select: { id: true, status: true },
  })
  if (!task) return

  let nextStatus: HarmonyTaskStatus | null = null
  let statusReason = ''

  if (input.receiptStatus === 'succeeded') {
    if (isHarmonyTaskStatus(task.status) && canTransitionHarmonyTask(task.status, 'MARK_COMPLETED')) {
      nextStatus = transitionHarmonyTask(task.status, 'MARK_COMPLETED')
      statusReason = `Runtime receipt ${input.receiptId ?? input.runtimeJobId} succeeded; task marked completed.`
    } else {
      statusReason = `Runtime receipt ${input.receiptId ?? input.runtimeJobId} succeeded; task status "${task.status}" was not auto-completable.`
    }
  } else if (input.receiptStatus === 'dry_run') {
    statusReason = `Runtime receipt ${input.receiptId ?? input.runtimeJobId} is dry_run; task was not marked completed.`
  } else if (input.receiptStatus === 'blocked') {
    if (isHarmonyTaskStatus(task.status) && canTransitionHarmonyTask(task.status, 'BLOCK')) {
      nextStatus = transitionHarmonyTask(task.status, 'BLOCK')
    }
    statusReason = `Runtime receipt ${input.receiptId ?? input.runtimeJobId} was blocked.`
  } else if (input.receiptStatus === 'failed') {
    if (isHarmonyTaskStatus(task.status) && canTransitionHarmonyTask(task.status, 'FAIL')) {
      nextStatus = transitionHarmonyTask(task.status, 'FAIL')
    }
    statusReason = `Runtime receipt ${input.receiptId ?? input.runtimeJobId} failed.`
  } else {
    statusReason = `Runtime receipt ${input.receiptId ?? input.runtimeJobId} status is ${input.receiptStatus}.`
  }

  await prisma.harmonyTask.update({
    where: { id: input.taskId },
    data: {
      ...(nextStatus ? { status: nextStatus } : {}),
      statusReason,
    },
  })
  await prisma.harmonyAuditEvent.create({
    data: {
      correlationId: input.correlationId,
      taskId: input.taskId,
      eventType: nextStatus === 'completed' ? 'task.status_changed' : 'runtime_execution.task_observed',
      actorType: 'worker_daemon',
      actorId: input.workerId,
      beforeStatus: task.status,
      afterStatus: nextStatus ?? task.status,
      reason: statusReason,
      payloadJson: JSON.stringify({
        runtimeJobId: input.runtimeJobId,
        receiptId: input.receiptId ?? null,
        receiptStatus: input.receiptStatus,
      }),
    },
  })
}

async function blockHarmonyTaskFromWorker(input: {
  taskId: string
  reason: string
  correlationId: string
  workerId: string
  queueJobId: string
}): Promise<void> {
  const task = await prisma.harmonyTask.findUnique({
    where: { id: input.taskId },
    select: { id: true, status: true },
  })
  if (!task) return

  let nextStatus: HarmonyTaskStatus | null = null
  if (isHarmonyTaskStatus(task.status) && canTransitionHarmonyTask(task.status, 'BLOCK')) {
    nextStatus = transitionHarmonyTask(task.status, 'BLOCK')
  }
  const statusReason = `Worker blocked production execution closure: ${input.reason}`

  await prisma.harmonyTask.update({
    where: { id: input.taskId },
    data: {
      ...(nextStatus ? { status: nextStatus } : {}),
      statusReason,
    },
  })
  await prisma.harmonyAuditEvent.create({
    data: {
      correlationId: input.correlationId,
      taskId: input.taskId,
      eventType: 'runtime_execution.task_blocked',
      actorType: 'worker_daemon',
      actorId: input.workerId,
      beforeStatus: task.status,
      afterStatus: nextStatus ?? task.status,
      reason: statusReason,
      payloadJson: JSON.stringify({
        queueJobId: input.queueJobId,
      }),
    },
  })
}

/**
 * 执行 TaskQueueJob 关联的 Sprint 22 RuntimeDispatchJob。
 * 这是 Production Execution Closure 的最小接线点：
 * TaskQueueJob 只做后台调度壳，真实权限、scope、receipt 仍由 RuntimeExecutionToken/Job 控制。
 */
export async function executeRuntimeDispatchQueueJob(
  job: QueueJobRecord,
  options: RuntimeQueueExecutionOptions
): Promise<JobExecutionResult> {
  const startTime = Date.now()
  const runtimeJobs = await listRuntimeDispatchJobs({
    taskId: job.taskId,
    status: 'queued',
    limit: 1,
  })
  const runtimeJob = runtimeJobs[0]
  if (!runtimeJob) {
    throw new WorkerJobBlockedError(
      `No queued RuntimeDispatchJob found for TaskQueueJob ${job.id} and task ${job.taskId}.`
    )
  }

  if (runtimeJob.connectorId !== 'obsidian_local' || runtimeJob.actionType !== 'write_local_markdown_draft') {
    throw new WorkerJobBlockedError(
      `RuntimeDispatchJob ${runtimeJob.id} is outside the allowed Production Execution Closure connector boundary.`
    )
  }

  const mode = options.mode ?? 'dry_run'
  const result = await runRuntimeDispatchJobOnce({
    jobId: runtimeJob.id,
    workerId: options.workerId,
    mode,
    execute: mode === 'obsidian_write' ? options.executeRealConnectors === true : undefined,
    vaultPath: options.vaultPath,
    leaseDurationMs: options.leaseDurationMs,
    now: options.now,
  })

  const receipt = result.completion.receipt
  await advanceHarmonyTaskFromRuntimeReceipt({
    taskId: job.taskId,
    receiptStatus: receipt.status,
    receiptId: receipt.id,
    runtimeJobId: runtimeJob.id,
    correlationId: runtimeJob.correlationId,
    workerId: options.workerId,
  })

  const durationMs = Date.now() - startTime

  return {
    status: 'completed',
    summary: `Runtime dispatch job ${runtimeJob.id} completed with receipt status ${receipt.status}.`,
    deliverables: [{
      runtimeJobId: runtimeJob.id,
      receiptId: receipt.id,
      receiptStatus: receipt.status,
      mode,
    }],
    durationMs,
  }
}

// ─── ExecutionWorker 类 ────────────────────────────────────────

export class ExecutionWorker {
  private state: WorkerRuntimeState
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private shutdownPromise: Promise<void> | null = null

  constructor(config: WorkerConfig) {
    this.state = {
      config,
      status: 'offline',
      activeJobIds: new Set(),
      completedToday: 0,
      failedToday: 0,
      avgDurationMs: 0,
      isShuttingDown: false,
    }
  }

  // ─── 生命周期 ──────────────────────────────────────────────

  /**
   * 启动 Worker
   */
  async start(): Promise<void> {
    this.emit({
      type: 'worker_started',
      workerId: this.state.config.workerId,
      capabilities: this.state.config.capabilities,
      timestamp: new Date(),
    })

    // 1. 注册 Worker
    await registerWorker({
      workerId: this.state.config.workerId,
      capabilities: this.state.config.capabilities,
      maxConcurrent: this.state.config.maxConcurrent,
    })
    this.state.status = 'online'

    // 2. 启动心跳
    this.heartbeatTimer = setInterval(
      () => this.sendHeartbeat(),
      this.state.config.heartbeatIntervalMs
    )

    // 3. 启动主循环（非阻塞）
    this.pollTimer = setInterval(
      () => this.pollAndExecute(),
      this.state.config.pollIntervalMs
    )
  }

  /**
   * 停止 Worker
   */
  async stop(reason: string = 'manual'): Promise<void> {
    if (this.state.isShuttingDown) return
    this.state.isShuttingDown = true

    this.emit({
      type: 'worker_stopping',
      workerId: this.state.config.workerId,
      reason,
      timestamp: new Date(),
    })

    // 1. 停止接收新任务
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    this.state.status = 'draining'

    // 2. 等待当前任务完成（带超时）
    if (this.state.activeJobIds.size > 0) {
      const deadline = Date.now() + 30_000 // 最多等 30s
      while (this.state.activeJobIds.size > 0 && Date.now() < deadline) {
        await sleep(500)
      }
      // 超时强制放弃
      if (this.state.activeJobIds.size > 0) {
        console.warn(
          `[Worker] Forcibly abandoning ${this.state.activeJobIds.size} jobs on shutdown`
        )
      }
    }

    // 3. 注销 Worker
    await deregisterWorker(this.state.config.workerId)
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    this.state.status = 'offline'

    this.emit({
      type: 'worker_stopped',
      workerId: this.state.config.workerId,
      timestamp: new Date(),
    })
  }

  /**
   * 等待 Worker 关闭
   */
  waitForShutdown(): Promise<void> {
    if (!this.shutdownPromise) {
      this.shutdownPromise = new Promise((resolve) => {
        const check = () => {
          if (this.state.status === 'offline') {
            resolve()
          } else {
            setTimeout(check, 100)
          }
        }
        check()
      })
    }
    return this.shutdownPromise
  }

  // ─── 主循环 ────────────────────────────────────────────────

  /**
   * 主循环：扫描队列 → 认领任务 → 异步执行
   */
  private async pollAndExecute(): Promise<void> {
    if (this.state.isShuttingDown) return
    if (this.state.activeJobIds.size >= this.state.config.maxConcurrent) return

    try {
      // 1. 扫描可认领任务
      const availableSlots = this.state.config.maxConcurrent - this.state.activeJobIds.size
      const jobs = await findPendingJobs({
        capabilities: this.state.config.capabilities,
        limit: availableSlots,
      })

      for (const job of jobs) {
        if (this.state.isShuttingDown) break
        if (this.state.activeJobIds.size >= this.state.config.maxConcurrent) break

        // 2. 认领任务（Lease）
        const claimed = await this.leaseJob(job)
        if (!claimed) continue // 被其他 Worker 抢走了

        // 3. 异步执行（不阻塞主循环）
        this.executeJobAsync(claimed)
      }
    } catch (error) {
      console.error(`[Worker] Poll error: ${error}`)
    }
  }

  // ─── 任务认领 ──────────────────────────────────────────────

  /**
   * 认领任务（CAS 原子操作）
   */
  private async leaseJob(job: QueueJobRecord): Promise<QueueJobRecord | null> {
    const claimed = await tryLeaseJob({
      jobId: job.id,
      workerId: this.state.config.workerId,
      leaseDurationMs: this.state.config.leaseDurationMs,
    })

    if (claimed) {
      this.emit({
        type: 'job_leased',
        workerId: this.state.config.workerId,
        jobId: job.id,
        taskId: job.taskId,
        timestamp: new Date(),
      })
    }

    return claimed
  }

  // ─── 任务执行 ──────────────────────────────────────────────

  /**
   * 异步执行任务
   */
  private async executeJobAsync(job: QueueJobRecord): Promise<void> {
    this.state.activeJobIds.add(job.id)
    const startTime = Date.now()

    try {
      // 1. 标记为 running
      await updateJobStatus(job.id, 'running')
      this.emit({
        type: 'job_started',
        workerId: this.state.config.workerId,
        jobId: job.id,
        timestamp: new Date(),
      })

      // 2. 执行任务（带超时）
      const result = await this.executeWithTimeout(
        () => executeRuntimeDispatchQueueJob(job, {
          workerId: this.state.config.workerId,
          leaseDurationMs: this.state.config.leaseDurationMs,
          mode: this.state.config.runtimeMode,
          executeRealConnectors: this.state.config.executeRealConnectors,
          vaultPath: this.state.config.vaultPath,
        }),
        job.timeoutMs
      )

      // 3. 上报成功
      const durationMs = Date.now() - startTime
      await completeJob({
        jobId: job.id,
        result: {
          ...result,
          durationMs,
        },
      })
      this.state.completedToday++
      this.updateAvgDuration(durationMs)

      const runtimeDeliverable = runtimeDeliverableFrom(result)
      this.emit({
        type: 'job_completed',
        workerId: this.state.config.workerId,
        jobId: job.id,
        queueJobId: job.id,
        runtimeJobId: runtimeDeliverable.runtimeJobId,
        receiptId: runtimeDeliverable.receiptId,
        receiptStatus: runtimeDeliverable.receiptStatus,
        durationMs,
        timestamp: new Date(),
      })
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (isBlockingRuntimeError(error)) {
        await blockJob(job.id, {
          message: errorMessage,
          durationMs,
          runtimeBoundary: 'production_execution_closure',
          blockedBy: 'worker_runtime_gate',
        })
        await blockHarmonyTaskFromWorker({
          taskId: job.taskId,
          reason: errorMessage,
          correlationId: job.correlationId,
          workerId: this.state.config.workerId,
          queueJobId: job.id,
        })
        this.state.failedToday++
        this.emit({
          type: 'job_blocked',
          workerId: this.state.config.workerId,
          jobId: job.id,
          reason: errorMessage,
          timestamp: new Date(),
        })
        return
      }

      // 判断是否可重试
      if (job.retryCount < job.maxRetries) {
        // 重新入队
        await requeueJob({
          jobId: job.id,
          retryCount: job.retryCount + 1,
          lastError: { message: errorMessage, durationMs },
        })
        this.emit({
          type: 'job_requeued',
          workerId: this.state.config.workerId,
          jobId: job.id,
          retryCount: job.retryCount + 1,
          timestamp: new Date(),
        })
      } else {
        // 进入死信队列
        await deadLetterJob({
          jobId: job.id,
          lastError: {
            message: errorMessage,
            durationMs,
            retriesExhausted: true,
          },
        })
        this.emit({
          type: 'job_dead_lettered',
          workerId: this.state.config.workerId,
          jobId: job.id,
          reason: 'Max retries exhausted',
          timestamp: new Date(),
        })
      }

      this.state.failedToday++
      this.emit({
        type: 'job_failed',
        workerId: this.state.config.workerId,
        jobId: job.id,
        error: errorMessage,
        timestamp: new Date(),
      })
    } finally {
      this.state.activeJobIds.delete(job.id)
    }
  }

  /**
   * 超时控制
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Job timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ])
  }

  // ─── 心跳 ─────────────────────────────────────────────────

  /**
   * 发送心跳
   */
  private async sendHeartbeat(): Promise<void> {
    try {
      const status: HeartbeatStatus =
        this.state.activeJobIds.size > 0 ? 'busy' : 'idle'

      await updateHeartbeat({
        workerId: this.state.config.workerId,
        status,
        metrics: {
          activeJobs: this.state.activeJobIds.size,
          completedToday: this.state.completedToday,
          failedToday: this.state.failedToday,
          avgDurationMs: Math.round(this.state.avgDurationMs),
        },
      })

      this.emit({
        type: 'heartbeat',
        workerId: this.state.config.workerId,
        status,
        metrics: { activeJobs: this.state.activeJobIds.size },
        timestamp: new Date(),
      })
    } catch (error) {
      console.error(`[Worker] Heartbeat failed: ${error}`)
    }
  }

  // ─── 超时回收（静态方法）──────────────────────────────────

  /**
   * 超时回收
   * 由定时任务或 Worker 主循环调用
   */
  static async reapExpiredLeases(): Promise<{
    reclaimed: number
    deadLettered: number
    jobIds: string[]
  }> {
    const result = await reclaimExpiredLeases()

    if (result.reclaimed > 0 || result.deadLettered > 0) {
      console.log(
        `[Worker Reaper] Reclaimed: ${result.reclaimed}, Dead-lettered: ${result.deadLettered}`
      )
    }

    return result
  }

  // ─── 工具方法 ──────────────────────────────────────────────

  /**
   * 发射事件（写入审计日志）
   */
  private async emit(event: WorkerEvent): Promise<void> {
    try {
      await createWorkerAuditEvent({
        correlationId: `worker-${this.state.config.workerId}`,
        eventType: `worker.${event.type}`,
        actorId: this.state.config.workerId,
        reason: `Worker event: ${event.type}`,
        payload: event as unknown as Record<string, unknown>,
      })
    } catch {
      // 审计日志失败不应影响 Worker 运行
      console.error(`[Worker] Failed to emit audit event: ${event.type}`)
    }
  }

  /**
   * 更新平均执行时长（滑动平均）
   */
  private updateAvgDuration(newDuration: number): void {
    const alpha = 0.1
    this.state.avgDurationMs =
      this.state.avgDurationMs * (1 - alpha) + newDuration * alpha
  }

  // ─── Getter ────────────────────────────────────────────────

  /**
   * 获取当前运行时状态（只读）
   */
  getState(): Readonly<WorkerRuntimeState> {
    return this.state
  }

  /**
   * 获取 Worker 配置
   */
  getConfig(): Readonly<WorkerConfig> {
    return this.state.config
  }
}

// ─── 工具函数 ──────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── 导出安全说明 ──────────────────────────────────────────────

export const WORKER_SAFETY_NOTE = SPRINT_23_SAFETY_NOTE
