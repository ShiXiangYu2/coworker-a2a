/**
 * Sprint 23 - Worker Daemon 启动脚本
 *
 * 独立运行的 Worker 进程，持续扫描任务队列并执行任务。
 *
 * 用法：
 *   npx tsx scripts/worker-start.ts
 *
 * 环境变量：
 *   WORKER_ID               Worker 唯一标识（默认 worker-{random8chars}）
 *   WORKER_CAPABILITIES     能力列表，逗号分隔（默认 sandbox）
 *   WORKER_MAX_CONCURRENT   最大并发数（默认 1）
 *   WORKER_POLL_INTERVAL_MS 扫描间隔毫秒（默认 5000）
 *   WORKER_HEARTBEAT_MS     心跳间隔毫秒（默认 30000）
 *   WORKER_LEASE_MS         Lease 时长毫秒（默认 120000）
 *   WORKER_JOB_TIMEOUT_MS   任务超时毫秒（默认 60000）
 *   WORKER_RUNTIME_MODE     runtime 执行模式：dry_run | obsidian_write（默认 dry_run）
 *   WORKER_EXECUTE_REAL     是否允许真实低风险连接器执行（默认 false）
 *   WORKER_VAULT_PATH       Obsidian vault 根目录（仅 obsidian_write 使用）
 *
 * 示例：
 *   # 默认启动
 *   npx tsx scripts/worker-start.ts
 *
 *   # 自定义配置
 *   WORKER_ID=my-worker-1 WORKER_CAPABILITIES=sandbox,git npx tsx scripts/worker-start.ts
 *
 *   # 后台运行
 *   nohup npx tsx scripts/worker-start.ts > worker.log 2>&1 &
 */

import { randomUUID } from 'node:crypto'
import { ExecutionWorker } from '@/lib/worker'
import type { WorkerCapability, WorkerConfig } from '@/lib/worker'

// ─── 环境变量解析 ──────────────────────────────────────────────

function parseCapabilities(value: string | undefined): WorkerCapability[] {
  const defaultCapabilities: WorkerCapability[] = ['sandbox']
  if (!value) return defaultCapabilities

  const valid: WorkerCapability[] = ['sandbox', 'git', 'api', 'deploy', 'obsidian', 'database']
  const parsed = value
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is WorkerCapability => valid.includes(s as WorkerCapability))

  return parsed.length > 0 ? parsed : defaultCapabilities
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue
  const num = parseInt(value, 10)
  return Number.isFinite(num) && num > 0 ? num : defaultValue
}

function generateWorkerId(): string {
  const random = randomUUID().slice(0, 8)
  return `worker-${random}`
}

function parseRuntimeMode(value: string | undefined): WorkerConfig['runtimeMode'] {
  return value === 'obsidian_write' ? 'obsidian_write' : 'dry_run'
}

// ─── 配置 ──────────────────────────────────────────────────────

const config: WorkerConfig = {
  workerId: process.env.WORKER_ID || generateWorkerId(),
  capabilities: parseCapabilities(process.env.WORKER_CAPABILITIES),
  maxConcurrent: parseNumber(process.env.WORKER_MAX_CONCURRENT, 1),
  pollIntervalMs: parseNumber(process.env.WORKER_POLL_INTERVAL_MS, 5000),
  heartbeatIntervalMs: parseNumber(process.env.WORKER_HEARTBEAT_MS, 30000),
  leaseDurationMs: parseNumber(process.env.WORKER_LEASE_MS, 120000),
  jobTimeoutMs: parseNumber(process.env.WORKER_JOB_TIMEOUT_MS, 60000),
  runtimeMode: parseRuntimeMode(process.env.WORKER_RUNTIME_MODE),
  executeRealConnectors: process.env.WORKER_EXECUTE_REAL === 'true',
  vaultPath: process.env.WORKER_VAULT_PATH,
}

// ─── 主函数 ────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60))
  console.log('CoWorker+A2A Worker Daemon')
  console.log('='.repeat(60))
  console.log()
  console.log('Configuration:')
  console.log(`  Worker ID:          ${config.workerId}`)
  console.log(`  Capabilities:       ${config.capabilities.join(', ')}`)
  console.log(`  Max Concurrent:     ${config.maxConcurrent}`)
  console.log(`  Poll Interval:      ${config.pollIntervalMs}ms`)
  console.log(`  Heartbeat Interval: ${config.heartbeatIntervalMs}ms`)
  console.log(`  Lease Duration:     ${config.leaseDurationMs}ms`)
  console.log(`  Job Timeout:        ${config.jobTimeoutMs}ms`)
  console.log(`  Runtime Mode:       ${config.runtimeMode}`)
  console.log(`  Real Connectors:    ${config.executeRealConnectors ? 'enabled' : 'disabled'}`)
  if (config.vaultPath) console.log(`  Vault Path:         ${config.vaultPath}`)
  console.log()
  console.log('Safety Note:')
  console.log('  Sprint 23 Worker Daemon provides asynchronous task execution.')
  console.log('  Workers can only execute tasks matching their declared capabilities.')
  console.log('  High-risk operations require Kelvin approval.')
  console.log()
  console.log('-'.repeat(60))

  // 创建 Worker
  const worker = new ExecutionWorker(config)

  // 优雅关闭
  let isShuttingDown = false

  async function shutdown(reason: string) {
    if (isShuttingDown) return
    isShuttingDown = true

    console.log()
    console.log(`[Worker] Shutting down: ${reason}`)
    console.log('[Worker] Waiting for active jobs to complete...')

    try {
      await worker.stop(reason)
      console.log('[Worker] Stopped gracefully.')
    } catch (error) {
      console.error(`[Worker] Error during shutdown: ${error}`)
    }

    process.exit(0)
  }

  // 注册信号处理器
  process.on('SIGTERM', () => shutdown('SIGTERM received'))
  process.on('SIGINT', () => shutdown('SIGINT received'))

  // 未捕获异常处理
  process.on('uncaughtException', async (error) => {
    console.error('[Worker] Uncaught exception:', error)
    await shutdown('uncaught_exception')
  })

  process.on('unhandledRejection', async (reason) => {
    console.error('[Worker] Unhandled rejection:', reason)
    await shutdown('unhandled_rejection')
  })

  // 启动 Worker
  try {
    await worker.start()
    console.log(`[Worker] ${config.workerId} started successfully.`)
    console.log('[Worker] Press Ctrl+C to stop.')
    console.log()

    // 保持进程运行
    // Worker 的主循环由 setInterval 驱动
    // 这里只需要保持进程不退出
    await new Promise<void>(() => {
      // 永不 resolve，直到收到关闭信号
    })
  } catch (error) {
    console.error('[Worker] Failed to start:', error)
    process.exit(1)
  }
}

main()
