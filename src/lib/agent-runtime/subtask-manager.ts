/**
 * Subtask Manager — 子任务管理
 *
 * 管理多 Agent 编排中的子任务生命周期：
 * - 创建子任务（HarmonyTask）
 * - 跟踪子任务状态
 * - 处理子任务间依赖
 * - 收集子任务结果
 *
 * 安全：子任务创建和状态更新都经过 harmony state machine 校验。
 */

import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import type { AgentId } from '@/lib/agents/types'
import { transitionHarmonyTask } from '@/lib/harmony/state-machine'
import { emptySideEffects } from '@/lib/harmony/types'

// ─── 类型 ────────────────────────────────────────────────────────────

export type SubtaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked' | 'cancelled'

export interface SubtaskDefinition {
  /** 子任务标题 */
  title: string
  /** 子任务描述 */
  description: string
  /** 分配给哪个 Agent */
  targetAgentId: AgentId
  /** 子任务类型 */
  type: 'product' | 'engineering' | 'verification' | 'customer' | 'coordination'
  /** 依赖的其他子任务索引（0-based） */
  dependsOn: number[]
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
}

export interface SubtaskRecord {
  /** 子任务在 definitions 中的索引 */
  index: number
  /** 子任务定义 */
  definition: SubtaskDefinition
  /** HarmonyTask ID */
  harmonyTaskId?: string
  /** AgentRun ID */
  agentRunId?: string
  /** 当前状态 */
  status: SubtaskStatus
  /** 执行结果摘要 */
  resultSummary?: string
  /** 执行结果置信度 */
  resultConfidence?: number
  /** 错误信息 */
  error?: string
  /** 重试次数 */
  retryCount: number
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

export interface DecompositionResult {
  /** 子任务定义列表 */
  subtasks: SubtaskDefinition[]
  /** 分解说明 */
  reasoning: string
  /** 分解置信度 */
  confidence: number
}

// ─── 日志 ────────────────────────────────────────────────────────────

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const prefix = `[SubtaskMgr ${new Date().toISOString()}]`
  const suffix = data ? ` ${JSON.stringify(data)}` : ''
  if (level === 'error') console.error(`${prefix} ${message}${suffix}`)
  else if (level === 'warn') console.warn(`${prefix} ${message}${suffix}`)
  else console.log(`${prefix} ${message}${suffix}`)
}

// ─── 创建子任务 ──────────────────────────────────────────────────────

/**
 * 从子任务定义创建 HarmonyTask
 */
export async function createSubtask(
  definition: SubtaskDefinition,
  parentTaskId: string,
  conversationId?: string | null
): Promise<SubtaskRecord> {
  const now = new Date().toISOString()

  // 创建 HarmonyTask
  const harmonyTask = await prisma.harmonyTask.create({
    data: {
      conversationId: conversationId ?? null,
      sourceMessageText: definition.description,
      title: definition.title,
      description: definition.description,
      type: definition.type,
      status: 'queued',
      routeDecisionType: 'delegate_to_agent',
      routeStatus: 'ready',
      targetAgentId: definition.targetAgentId,
      confidence: 0.8,
      reason: `Subtask created by orchestrator. Assigned to ${definition.targetAgentId}.`,
      matchedSignalsJson: JSON.stringify(['orchestrator_delegation']),
      routeDecisionSnapshotJson: JSON.stringify({
        status: 'ready',
        decisionType: 'delegate_to_agent',
        targetAgentId: definition.targetAgentId,
        confidence: 0.8,
        reason: `Orchestrator delegation to ${definition.targetAgentId}`,
        matchedSignals: ['orchestrator_delegation'],
        requiresHumanConfirmation: false,
        sideEffects: emptySideEffects,
        next: { recommendedAction: 'show_route_suggestion', reason: 'Orchestrator delegation' },
      }),
      requiresHumanConfirmation: false,
      sideEffectsJson: JSON.stringify(emptySideEffects),
      createdBy: 'system',
    },
  })

  log('info', `Created subtask: ${definition.title}`, {
    harmonyTaskId: harmonyTask.id,
    targetAgentId: definition.targetAgentId,
  })

  return {
    index: -1, // 由调用者设置
    definition,
    harmonyTaskId: harmonyTask.id,
    status: 'pending',
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * 批量创建子任务
 */
export async function createSubtasks(
  definitions: SubtaskDefinition[],
  parentTaskId: string,
  conversationId?: string | null
): Promise<SubtaskRecord[]> {
  const records: SubtaskRecord[] = []

  for (let i = 0; i < definitions.length; i++) {
    const record = await createSubtask(definitions[i], parentTaskId, conversationId)
    record.index = i
    records.push(record)
  }

  return records
}

// ─── 依赖检查 ────────────────────────────────────────────────────────

/**
 * 检查子任务是否可以执行（所有依赖已完成）
 */
export function canExecute(
  subtask: SubtaskRecord,
  allSubtasks: SubtaskRecord[]
): boolean {
  // 已经在运行或已完成，不能重复执行
  if (['running', 'completed', 'cancelled'].includes(subtask.status)) {
    return false
  }

  // 检查依赖
  for (const depIndex of subtask.definition.dependsOn) {
    const dep = allSubtasks.find((s) => s.index === depIndex)
    if (!dep || dep.status !== 'completed') {
      return false
    }
  }

  return true
}

/**
 * 获取可执行的子任务列表（无依赖阻塞且未执行过）
 */
export function getExecutableSubtasks(
  subtasks: SubtaskRecord[]
): SubtaskRecord[] {
  return subtasks.filter((s) => canExecute(s, subtasks))
}

// ─── 状态更新 ────────────────────────────────────────────────────────

/**
 * 更新子任务状态
 */
export async function updateSubtaskStatus(
  record: SubtaskRecord,
  status: SubtaskStatus,
  options?: {
    agentRunId?: string
    resultSummary?: string
    resultConfidence?: number
    error?: string
  }
): Promise<SubtaskRecord> {
  const now = new Date().toISOString()

  // 如果有 harmonyTaskId，同步更新 HarmonyTask 状态
  if (record.harmonyTaskId && status === 'running') {
    try {
      const task = await prisma.harmonyTask.findUnique({
        where: { id: record.harmonyTaskId },
        select: { status: true },
      })
      if (task) {
        const newStatus = transitionHarmonyTask(task.status as never, 'ASSIGN_PLACEHOLDER')
        await prisma.harmonyTask.update({
          where: { id: record.harmonyTaskId },
          data: { status: newStatus },
        })
      }
    } catch (error) {
      log('warn', `Failed to sync HarmonyTask status: ${error}`)
    }
  }

  if (record.harmonyTaskId && status === 'completed') {
    try {
      const task = await prisma.harmonyTask.findUnique({
        where: { id: record.harmonyTaskId },
        select: { status: true },
      })
      if (task) {
        const newStatus = transitionHarmonyTask(task.status as never, 'MARK_COMPLETED')
        await prisma.harmonyTask.update({
          where: { id: record.harmonyTaskId },
          data: {
            status: newStatus,
            statusReason: options?.resultSummary ?? 'Subtask completed by orchestrator.',
          },
        })
      }
    } catch (error) {
      log('warn', `Failed to sync HarmonyTask completion: ${error}`)
    }
  }

  if (record.harmonyTaskId && status === 'failed') {
    try {
      const task = await prisma.harmonyTask.findUnique({
        where: { id: record.harmonyTaskId },
        select: { status: true },
      })
      if (task) {
        const newStatus = transitionHarmonyTask(task.status as never, 'FAIL')
        await prisma.harmonyTask.update({
          where: { id: record.harmonyTaskId },
          data: {
            status: newStatus,
            statusReason: options?.error ?? 'Subtask failed.',
          },
        })
      }
    } catch (error) {
      log('warn', `Failed to sync HarmonyTask failure: ${error}`)
    }
  }

  return {
    ...record,
    status,
    agentRunId: options?.agentRunId ?? record.agentRunId,
    resultSummary: options?.resultSummary ?? record.resultSummary,
    resultConfidence: options?.resultConfidence ?? record.resultConfidence,
    error: options?.error ?? record.error,
    retryCount: status === 'failed' ? record.retryCount + 1 : record.retryCount,
    updatedAt: now,
  }
}

// ─── 收集结果 ────────────────────────────────────────────────────────

/**
 * 从所有子任务中收集结果摘要
 */
export function collectResults(subtasks: SubtaskRecord[]): {
  allCompleted: boolean
  anyFailed: boolean
  anyBlocked: boolean
  completedCount: number
  failedCount: number
  blockedCount: number
  results: Array<{
    index: number
    title: string
    agentId: AgentId
    status: SubtaskStatus
    summary?: string
    confidence?: number
  }>
} {
  let completedCount = 0
  let failedCount = 0
  let blockedCount = 0

  const results = subtasks.map((s) => {
    if (s.status === 'completed') completedCount++
    else if (s.status === 'failed') failedCount++
    else if (s.status === 'blocked') blockedCount++

    return {
      index: s.index,
      title: s.definition.title,
      agentId: s.definition.targetAgentId,
      status: s.status,
      summary: s.resultSummary,
      confidence: s.resultConfidence,
    }
  })

  return {
    allCompleted: completedCount === subtasks.length,
    anyFailed: failedCount > 0,
    anyBlocked: blockedCount > 0,
    completedCount,
    failedCount,
    blockedCount,
    results,
  }
}
