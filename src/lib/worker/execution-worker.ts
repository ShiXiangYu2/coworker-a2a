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
  WorkerRepositoryError,
} from './repository'

// ─── Mock 执行器 ──────────────────────────────────────────────

/**
 * Mock 任务执行器
 * Sprint 23 阶段使用固定结果，后续接入真实 Agent Runtime
 */
async function mockExecuteJob(
  job: QueueJobRecord
): Promise<JobExecutionResult> {
  const startTime = Date.now()

  // 模拟执行耗时（100-500ms）
  await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 400))

  const durationMs = Date.now() - startTime

  return {
    status: 'completed',
    summary: `Mock execution completed for task ${job.taskId}. Capabilities: ${job.requiredCapabilities.join(', ') || 'none'}.`,
    deliverables: [],
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
        () => mockExecuteJob(job),
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

      this.emit({
        type: 'job_completed',
        workerId: this.state.config.workerId,
        jobId: job.id,
        durationMs,
        timestamp: new Date(),
      })
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

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
