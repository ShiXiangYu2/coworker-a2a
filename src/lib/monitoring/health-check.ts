/**
 * Health Check — 系统健康检查
 *
 * 检查系统各组件的健康状态：
 *   - 数据库连接
 *   - LLM API 可用性
 *   - 磁盘空间
 *   - 内存使用
 *   - 队列深度
 */

import { prisma } from '@/lib/prisma'
import type { HealthCheck, SystemHealth, HealthStatus } from './types'
import { getPersistentQueueStatus } from '@/lib/scheduler/persistent-queue'

// ─── 健康检查函数 ──────────────────────────────────────────────────

/**
 * 执行所有健康检查
 */
export async function checkSystemHealth(): Promise<SystemHealth> {
  const checks = await Promise.all([
    checkDatabase(),
    checkLLMApi(),
    checkDiskSpace(),
    checkMemory(),
    checkQueueDepth(),
  ])

  // 确定整体状态
  const worstStatus = checks.reduce<HealthStatus>((worst, check) => {
    if (check.status === 'unhealthy') return 'unhealthy'
    if (check.status === 'degraded' && worst !== 'unhealthy') return 'degraded'
    return worst
  }, 'healthy')

  return {
    status: worstStatus,
    checks,
    uptime: process.uptime() * 1000,
    timestamp: new Date().toISOString(),
  }
}

// ─── 各组件检查 ────────────────────────────────────────────────────

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      name: 'database',
      status: 'healthy',
      message: 'SQLite connection OK',
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      name: 'database',
      status: 'unhealthy',
      message: `Database error: ${error instanceof Error ? error.message : String(error)}`,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    }
  }
}

async function checkLLMApi(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const provider = process.env.LLM_PROVIDER ?? 'mock'
    if (provider === 'mock') {
      return {
        name: 'llm_api',
        status: 'healthy',
        message: 'Using mock provider (no API call needed)',
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      }
    }

    // 对于真实 API，检查是否可连接
    const baseUrl = process.env.DEEPSEEK_BASE_URL ?? process.env.ANTHROPIC_BASE_URL
    if (!baseUrl) {
      return {
        name: 'llm_api',
        status: 'degraded',
        message: 'No LLM API base URL configured',
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      }
    }

    // 简单的健康检查请求
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    try {
      await fetch(baseUrl, { method: 'HEAD', signal: controller.signal })
      clearTimeout(timeout)
      return {
        name: 'llm_api',
        status: 'healthy',
        message: `LLM API reachable (${provider})`,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      }
    } catch {
      clearTimeout(timeout)
      return {
        name: 'llm_api',
        status: 'degraded',
        message: `LLM API unreachable (${provider})`,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      }
    }
  } catch (error) {
    return {
      name: 'llm_api',
      status: 'unhealthy',
      message: `LLM check failed: ${error instanceof Error ? error.message : String(error)}`,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    }
  }
}

async function checkDiskSpace(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const fs = await import('node:fs/promises')
    const stats = await fs.statfs('.')
    const freeGB = (stats.bfree * stats.bsize) / (1024 * 1024 * 1024)

    if (freeGB < 1) {
      return {
        name: 'disk_space',
        status: 'unhealthy',
        message: `Low disk space: ${freeGB.toFixed(2)} GB free`,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      }
    }

    if (freeGB < 5) {
      return {
        name: 'disk_space',
        status: 'degraded',
        message: `Disk space warning: ${freeGB.toFixed(2)} GB free`,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      }
    }

    return {
      name: 'disk_space',
      status: 'healthy',
      message: `Disk space OK: ${freeGB.toFixed(2)} GB free`,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    }
  } catch {
    return {
      name: 'disk_space',
      status: 'healthy',
      message: 'Disk space check skipped',
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    }
  }
}

async function checkMemory(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const memUsage = process.memoryUsage()
    const heapUsedMB = memUsage.heapUsed / (1024 * 1024)
    const heapTotalMB = memUsage.heapTotal / (1024 * 1024)
    const usagePercent = (heapUsedMB / heapTotalMB) * 100

    if (usagePercent > 90) {
      return {
        name: 'memory',
        status: 'unhealthy',
        message: `Memory critical: ${heapUsedMB.toFixed(0)}MB / ${heapTotalMB.toFixed(0)}MB (${usagePercent.toFixed(0)}%)`,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      }
    }

    if (usagePercent > 70) {
      return {
        name: 'memory',
        status: 'degraded',
        message: `Memory warning: ${heapUsedMB.toFixed(0)}MB / ${heapTotalMB.toFixed(0)}MB (${usagePercent.toFixed(0)}%)`,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      }
    }

    return {
      name: 'memory',
      status: 'healthy',
      message: `Memory OK: ${heapUsedMB.toFixed(0)}MB / ${heapTotalMB.toFixed(0)}MB (${usagePercent.toFixed(0)}%)`,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    }
  } catch {
    return {
      name: 'memory',
      status: 'healthy',
      message: 'Memory check skipped',
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    }
  }
}

async function checkQueueDepth(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const status = await getPersistentQueueStatus()
    const depth = status.queued + status.running

    if (depth > 100) {
      return {
        name: 'queue_depth',
        status: 'unhealthy',
        message: `Queue depth critical: ${depth} tasks`,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      }
    }

    if (depth > 50) {
      return {
        name: 'queue_depth',
        status: 'degraded',
        message: `Queue depth warning: ${depth} tasks`,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      }
    }

    return {
      name: 'queue_depth',
      status: 'healthy',
      message: `Queue depth OK: ${depth} tasks (${status.queued} queued, ${status.running} running)`,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    }
  } catch {
    return {
      name: 'queue_depth',
      status: 'healthy',
      message: 'Queue depth check skipped',
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    }
  }
}
