/**
 * Persistent Event Bus — 持久化事件总线
 *
 * 在原有内存事件总线基础上，增加数据库持久化。
 * 进程重启后事件不丢失。
 *
 * 双写策略：
 *   1. 内存：实时订阅（保持原有行为）
 *   2. 数据库：持久化存储（进程重启后可恢复）
 *
 * 查询历史事件时从数据库读取。
 */

import { prisma } from '@/lib/prisma'
import type { AgentEvent, AgentEventType } from './event-bus'
import { subscribeEvent, getEventHistory as getMemoryHistory } from './event-bus'

// ─── 持久化配置 ────────────────────────────────────────────────────

const PERSIST_BATCH_SIZE = 10 // 批量写入阈值
const PERSIST_FLUSH_INTERVAL_MS = 5_000 // 5 秒刷新一次
const MAX_DB_EVENTS = 10_000 // 数据库最大事件数

// ─── 批量写入缓冲 ──────────────────────────────────────────────────

let persistBuffer: Array<{
  eventType: string
  agentId: string
  taskId?: string
  dataJson: string
  createdAt: Date
}> = []

let flushTimer: ReturnType<typeof setInterval> | null = null

// ─── 初始化 ────────────────────────────────────────────────────────

/**
 * 初始化持久化事件总线
 *
 * 启动定时刷新，将内存中的事件批量写入数据库。
 */
export function initPersistentEventBus(): void {
  if (flushTimer) return // 已初始化

  // 订阅所有事件，写入持久化缓冲
  subscribeEvent('*', (event: AgentEvent) => {
    persistBuffer.push({
      eventType: event.type,
      agentId: event.agentId,
      taskId: event.taskId,
      dataJson: JSON.stringify(event.data),
      createdAt: new Date(event.timestamp),
    })

    // 达到阈值时立即刷新
    if (persistBuffer.length >= PERSIST_BATCH_SIZE) {
      flushPersistBuffer()
    }
  })

  // 定时刷新
  flushTimer = setInterval(flushPersistBuffer, PERSIST_FLUSH_INTERVAL_MS)

  console.log('[PersistentEventBus] Initialized')
}

/**
 * 停止持久化事件总线
 */
export function stopPersistentEventBus(): void {
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
  flushPersistBuffer() // 最后刷新一次
}

// ─── 批量写入 ──────────────────────────────────────────────────────

async function flushPersistBuffer(): Promise<void> {
  if (persistBuffer.length === 0) return

  const batch = [...persistBuffer]
  persistBuffer = []

  try {
    await prisma.persistentEvent.createMany({
      data: batch.map((e) => ({
        eventType: e.eventType,
        agentId: e.agentId,
        taskId: e.taskId,
        dataJson: e.dataJson,
        createdAt: e.createdAt,
      })),
    })

    // 清理旧事件
    await pruneOldEvents()
  } catch (error) {
    console.error('[PersistentEventBus] Failed to persist events:', error)
    // 写入失败的事件放回缓冲区
    persistBuffer = [...batch, ...persistBuffer]
  }
}

async function pruneOldEvents(): Promise<void> {
  try {
    const count = await prisma.persistentEvent.count()
    if (count > MAX_DB_EVENTS) {
      const toDelete = count - MAX_DB_EVENTS
      const oldest = await prisma.persistentEvent.findMany({
        orderBy: { createdAt: 'asc' },
        take: toDelete,
        select: { id: true },
      })

      if (oldest.length > 0) {
        await prisma.persistentEvent.deleteMany({
          where: { id: { in: oldest.map((e) => e.id) } },
        })
      }
    }
  } catch {
    // 清理失败不影响主流程
  }
}

// ─── 查询接口 ──────────────────────────────────────────────────────

/**
 * 获取事件历史（优先从内存，内存不足时从数据库）
 */
export async function getPersistentEventHistory(options: {
  type?: AgentEventType
  agentId?: string
  taskId?: string
  limit?: number
  since?: string
} = {}): Promise<AgentEvent[]> {
  const { type, agentId, taskId, limit = 50, since } = options

  // 先从内存获取
  const memoryEvents = getMemoryHistory(options)

  if (memoryEvents.length >= limit) {
    return memoryEvents.slice(-limit)
  }

  // 内存不足，从数据库补充
  try {
    const where: Record<string, unknown> = {}
    if (type) where.eventType = type
    if (agentId) where.agentId = agentId
    if (taskId) where.taskId = taskId
    if (since) where.createdAt = { gte: new Date(since) }

    const dbEvents = await prisma.persistentEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // 转换为 AgentEvent 格式
    const dbAgentEvents: AgentEvent[] = dbEvents.map((e) => ({
      id: e.id,
      type: e.eventType as AgentEventType,
      timestamp: e.createdAt.toISOString(),
      agentId: e.agentId,
      taskId: e.taskId ?? undefined,
      data: JSON.parse(e.dataJson),
    }))

    // 合并并去重（内存优先）
    const seen = new Set(memoryEvents.map((e) => e.id))
    const merged = [...memoryEvents, ...dbAgentEvents.filter((e) => !seen.has(e.id))]

    return merged
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-limit)
  } catch {
    return memoryEvents
  }
}

/**
 * 获取事件统计
 */
export async function getEventStats(): Promise<{
  totalEvents: number
  todayEvents: number
  byType: Record<string, number>
  byAgent: Record<string, number>
}> {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [totalEvents, todayEvents, byTypeEvents, byAgentEvents] = await Promise.all([
      prisma.persistentEvent.count(),
      prisma.persistentEvent.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.persistentEvent.groupBy({
        by: ['eventType'],
        _count: true,
        orderBy: { _count: { eventType: 'desc' } },
        take: 10,
      }),
      prisma.persistentEvent.groupBy({
        by: ['agentId'],
        _count: true,
        orderBy: { _count: { agentId: 'desc' } },
        take: 10,
      }),
    ])

    const byType: Record<string, number> = {}
    for (const item of byTypeEvents) {
      byType[item.eventType] = item._count
    }

    const byAgent: Record<string, number> = {}
    for (const item of byAgentEvents) {
      byAgent[item.agentId] = item._count
    }

    return { totalEvents, todayEvents, byType, byAgent }
  } catch {
    return { totalEvents: 0, todayEvents: 0, byType: {}, byAgent: {} }
  }
}
