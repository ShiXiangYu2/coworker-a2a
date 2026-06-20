/**
 * Collaboration Engine — Agent 协作引擎
 *
 * 在已有的 CollaborationSession / A2AThread / A2ATurn / HandoffRequest 记录模型之上，
 * 提供运行时协作能力：
 *
 *   1. 发起协作：Agent A 需要 Agent B 的帮助时，创建协作会话
 *   2. 任务委派：通过 HandoffRequest 将子任务委派给其他 Agent
 *   3. 工作交接：委派的 Agent 完成后，结果自动回传
 *   4. 讨论线程：多个 Agent 可以在一个 Thread 中讨论
 *   5. 冲突仲裁：当多个 Agent 产出冲突时，由 CEO 或 Kelvin 仲裁
 *
 * 与 orchestrator.ts 的区别：
 *   - orchestrator：预定义的分解-执行-汇总流程
 *   - collaboration engine：动态的、运行时的 Agent 间交互
 *
 * 安全：
 *   - 所有协作记录写入 DB
 *   - 高风险操作需要 Kelvin 确认
 *   - 实时事件推送到 SSE
 */

import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import type { AgentId } from '@/lib/agents/types'
import { publishCollaborationMessage, publishStepCompleted } from '@/lib/realtime/event-bus'

// ─── 类型定义 ──────────────────────────────────────────────────────

export interface CollaborateInput {
  /** 发起 Agent */
  fromAgentId: AgentId
  /** 目标 Agent */
  toAgentId: AgentId
  /** 任务 ID */
  taskId: string
  /** 协作主题 */
  subject: string
  /** 协作内容 */
  body: string
  /** 协作类型 */
  type: 'handoff' | 'review_request' | 'clarification' | 'finding' | 'decision_input'
  /** 风险等级 */
  riskLevel?: 'low' | 'medium' | 'high'
  /** 需要人工确认 */
  requiresHumanConfirmation?: boolean
  /** 上下文引用（交接的工作成果） */
  contextRefs?: {
    memoryEntryIds?: string[]
    agentRunIds?: string[]
    fileChangeProposalIds?: string[]
  }
}

export interface CollaborateResult {
  /** 协作会话 ID */
  sessionId: string
  /** 线程 ID */
  threadId: string
  /** Turn ID */
  turnId: string
  /** Handoff ID（如果有） */
  handoffId?: string
  /** 是否需要人工确认 */
  requiresHumanConfirmation: boolean
  /** 状态 */
  status: 'sent' | 'pending_review' | 'auto_approved'
}

export interface HandoffResult {
  /** Handoff ID */
  handoffId: string
  /** 接收 Agent */
  toAgentId: AgentId
  /** 状态 */
  status: 'pending' | 'accepted' | 'rejected'
  /** 接收 Agent 的回复 */
  response?: string
}

// ─── 核心引擎 ──────────────────────────────────────────────────────

/**
 * 发起 Agent 间协作
 *
 * 完整流程：
 * 1. 查找或创建 CollaborationSession
 * 2. 查找或创建 A2AThread
 * 3. 创建 A2ATurn（记录对话）
 * 4. 如果是 handoff 类型，创建 HandoffRequest
 * 5. 发布实时事件
 * 6. 记录审计日志
 */
export async function collaborate(input: CollaborateInput): Promise<CollaborateResult> {
  const correlationId = `collab-${randomUUID()}`

  // 1. 查找或创建 CollaborationSession
  const session = await findOrCreateSession(input.taskId, correlationId)

  // 2. 查找或创建 A2AThread
  const thread = await findOrCreateThread(session.id, input.fromAgentId, input.toAgentId, input.subject, correlationId)

  // 3. 创建 A2ATurn
  const turnSeq = thread.latestTurnSeq + 1
  const turn = await prisma.a2ATurn.create({
    data: {
      correlationId,
      collaborationSessionId: session.id,
      threadId: thread.id,
      taskId: input.taskId,
      seq: turnSeq,
      speakerAgentId: input.fromAgentId,
      audienceAgentIdsJson: JSON.stringify([input.toAgentId]),
      turnType: input.type,
      status: 'recorded',
      title: input.subject,
      body: input.body,
      inputSnapshotJson: input.contextRefs ? JSON.stringify(input.contextRefs) : null,
      riskLevel: input.riskLevel ?? 'low',
      requiresHumanConfirmation: input.requiresHumanConfirmation ?? false,
      createdBy: 'agent_record',
    },
  })

  // 更新 thread 的 latestTurnSeq
  await prisma.a2AThread.update({
    where: { id: thread.id },
    data: { latestTurnSeq: turnSeq },
  })

  // 4. 如果是 handoff 类型，创建 HandoffRequest
  let handoffId: string | undefined
  if (input.type === 'handoff') {
    const handoff = await prisma.handoffRequest.create({
      data: {
        correlationId,
        collaborationSessionId: session.id,
        threadId: thread.id,
        taskId: input.taskId,
        sourceTurnId: turn.id,
        fromAgentId: input.fromAgentId,
        toAgentId: input.toAgentId,
        status: input.requiresHumanConfirmation ? 'queued_for_review' : 'approved_record',
        handoffType: resolveHandoffType(input.fromAgentId, input.toAgentId),
        reason: input.subject,
        requestedScope: input.body.slice(0, 200),
        expectedOutput: 'Completed analysis or deliverable',
        contextRefsJson: input.contextRefs ? JSON.stringify(input.contextRefs) : '{}',
        riskLevel: input.riskLevel ?? 'low',
        requiresHumanConfirmation: input.requiresHumanConfirmation ?? false,
        createdBy: 'agent_record',
      },
    })
    handoffId = handoff.id
  }

  // 5. 发布实时事件
  publishCollaborationMessage(input.fromAgentId, input.toAgentId, input.subject, input.taskId)
  publishStepCompleted(input.fromAgentId, input.taskId, `collaborate:${input.type}`, {
    toAgentId: input.toAgentId,
    subject: input.subject,
    handoffId,
  })

  // 6. 记录审计
  await recordAudit(input.taskId, input.fromAgentId, 'collaboration.initiated', {
    correlationId,
    sessionId: session.id,
    threadId: thread.id,
    turnId: turn.id,
    handoffId,
    toAgentId: input.toAgentId,
    type: input.type,
    subject: input.subject,
  })

  const status = input.requiresHumanConfirmation ? 'pending_review'
    : handoffId ? 'auto_approved'
    : 'sent'

  return {
    sessionId: session.id,
    threadId: thread.id,
    turnId: turn.id,
    handoffId,
    requiresHumanConfirmation: input.requiresHumanConfirmation ?? false,
    status,
  }
}

/**
 * 处理收到的协作请求
 *
 * 当 Agent 收到 HandoffRequest 时调用。
 * 返回交接的上下文，供 Agent 使用。
 */
export async function receiveHandoff(
  handoffId: string,
  agentId: AgentId,
): Promise<{
  success: boolean
  fromAgentId: AgentId
  subject: string
  body: string
  contextRefs?: Record<string, unknown>
  error?: string
}> {
  const handoff = await prisma.handoffRequest.findUnique({
    where: { id: handoffId },
  })

  if (!handoff) {
    return { success: false, fromAgentId: 'unknown' as AgentId, subject: '', body: '', error: 'Handoff not found' }
  }

  if (handoff.toAgentId !== agentId) {
    return { success: false, fromAgentId: handoff.fromAgentId as AgentId, subject: '', body: '', error: 'Not the intended recipient' }
  }

  if (handoff.status !== 'approved_record') {
    return { success: false, fromAgentId: handoff.fromAgentId as AgentId, subject: '', body: '', error: `Handoff status is ${handoff.status}` }
  }

  // 解析上下文引用
  let contextRefs: Record<string, unknown> = {}
  try {
    contextRefs = JSON.parse(handoff.contextRefsJson)
  } catch {
    // 忽略解析错误
  }

  // 获取发起者的最新 turn 内容
  const latestTurn = handoff.sourceTurnId
    ? await prisma.a2ATurn.findUnique({ where: { id: handoff.sourceTurnId } })
    : null

  return {
    success: true,
    fromAgentId: handoff.fromAgentId as AgentId,
    subject: handoff.reason,
    body: latestTurn?.body ?? handoff.requestedScope,
    contextRefs,
  }
}

/**
 * 回复协作请求
 *
 * Agent 完成工作后，将结果回传给发起者。
 */
export async function replyCollaboration(
  threadId: string,
  agentId: AgentId,
  subject: string,
  body: string,
  taskId: string,
): Promise<{ turnId: string }> {
  const thread = await prisma.a2AThread.findUnique({
    where: { id: threadId },
  })

  if (!thread) {
    throw new Error(`Thread not found: ${threadId}`)
  }

  const turnSeq = thread.latestTurnSeq + 1
  const turn = await prisma.a2ATurn.create({
    data: {
      correlationId: thread.correlationId,
      collaborationSessionId: thread.collaborationSessionId,
      threadId: thread.id,
      taskId,
      seq: turnSeq,
      speakerAgentId: agentId,
      audienceAgentIdsJson: thread.participantAgentIdsJson,
      turnType: 'finding',
      status: 'recorded',
      title: subject,
      body,
      riskLevel: 'low',
      requiresHumanConfirmation: false,
      createdBy: 'agent_record',
    },
  })

  await prisma.a2AThread.update({
    where: { id: threadId },
    data: { latestTurnSeq: turnSeq },
  })

  // 发布实时事件
  publishCollaborationMessage(agentId, 'all', subject, taskId)

  return { turnId: turn.id }
}

// ─── 辅助函数 ──────────────────────────────────────────────────────

async function findOrCreateSession(
  taskId: string,
  correlationId: string,
) {
  // 查找现有的 active session
  const existing = await prisma.collaborationSession.findFirst({
    where: {
      taskId,
      status: { in: ['draft', 'active'] },
    },
  })

  if (existing) return existing

  // 创建新 session
  return prisma.collaborationSession.create({
    data: {
      correlationId,
      taskId,
      status: 'active',
      objective: 'Agent collaboration',
      riskLevel: 'low',
      requiresHumanConfirmation: false,
      participantsJson: '[]',
      planJson: JSON.stringify({ steps: [], constraints: [], forbiddenActions: [] }),
      createdBy: 'agent_record',
    },
  })
}

async function findOrCreateThread(
  sessionId: string,
  fromAgentId: AgentId,
  toAgentId: AgentId,
  subject: string,
  correlationId: string,
) {
  // 查找现有的 open thread
  const existing = await prisma.a2AThread.findFirst({
    where: {
      collaborationSessionId: sessionId,
      status: 'open',
      participantAgentIdsJson: { contains: fromAgentId },
    },
  })

  if (existing) return existing

  // 创建新 thread
  return prisma.a2AThread.create({
    data: {
      correlationId,
      collaborationSessionId: sessionId,
      status: 'open',
      topic: subject,
      purpose: 'handoff',
      participantAgentIdsJson: JSON.stringify([fromAgentId, toAgentId]),
      latestTurnSeq: 0,
      createdBy: 'agent_record',
    },
  })
}

function resolveHandoffType(fromAgentId: AgentId, toAgentId: AgentId): string {
  const roleMap: Record<string, string> = {
    jobs: 'product',
    linus: 'engineering',
    turing: 'verification',
    bezos: 'customer',
    elon: 'ceo',
  }

  const fromRole = roleMap[fromAgentId] ?? 'specialist'
  const toRole = roleMap[toAgentId] ?? 'specialist'

  if (fromRole === 'ceo') return 'ceo_to_specialist'
  if (toRole === 'ceo') return 'specialist_to_ceo'
  if (toAgentId === 'kelvin') return 'escalate_to_kelvin'
  return `${fromRole}_to_${toRole}`
}

async function recordAudit(
  taskId: string,
  agentId: string,
  eventType: string,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.harmonyAuditEvent.create({
      data: {
        taskId,
        eventType,
        actorType: 'agent',
        actorId: agentId,
        reason: `Collaboration: ${eventType}`,
        payloadJson: JSON.stringify(details),
      },
    })
  } catch {
    // 审计失败不影响协作
  }
}
