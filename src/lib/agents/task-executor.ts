/**
 * Agent 任务执行器
 *
 * 让单个 Agent 使用 Skill Prompt + LLM 执行具体任务。
 * 支持自动注入相关 Evidence 和 Memory 作为分析上下文。
 *
 * 核心变更（Sprint 24）：
 *   - 使用 runAgentLoop 替代直接 LLM 调用，实现真正的多轮推理-行动循环
 *   - 工具执行走沙箱（sandbox_execution 模式），不再手动循环
 *   - 保留 evidence + memory + 协作上下文注入
 *   - 保留 produce_deliverable 支持
 */

import type { AgentId, Deliverable } from './types'
import { getAgentById } from './registry'
import { findRelevantEvidence } from '@/lib/evidence/repository'
import { prisma } from '@/lib/prisma'
import { runAgentLoop } from '@/lib/agent-runtime/agent-loop'

/** 子任务执行结果 */
export interface SubTaskResult {
  agentId: string
  agentName: string
  title: string
  status: 'completed' | 'failed' | 'timeout'
  confidence: number
  summary: string
  findings: string[]
  deliverables: Deliverable[]
  durationMs: number
  error?: string
  agentTaskRunRecordId?: string
  blockedToolRequests?: BlockedToolRequest[]
  requiresApproval?: boolean
  proposedActionSummary?: string
  executionIntentRecordId?: string
  executionPlanRecordId?: string
}

export interface BlockedToolRequest {
  toolName: string
  input: unknown
  reason: string
}

export interface AgentTaskExecutionOptions {
  allowDirectToolExecution?: boolean
  /** HarmonyTask ID（如果已有任务记录，传入后可使用 Agent Loop 的完整审计链路） */
  taskId?: string
  /** 对话 ID（用于上下文注入） */
  conversationId?: string
}

const knownAgentIds: AgentId[] = ['kelvin', 'elon', 'jobs', 'linus', 'turing', 'bezos']

function isAgentId(value: string): value is AgentId {
  return knownAgentIds.includes(value as AgentId)
}

/**
 * 执行单个 Agent 任务
 *
 * 当传入 taskId 时，使用 Agent Loop（多轮推理-行动循环 + 沙箱执行 + 审计记录）。
 * 当未传入 taskId 时，使用 turn loop（多轮 LLM 交互 + 工具调用）。
 *
 * @param agentId 目标 Agent ID
 * @param taskDescription 任务描述
 * @param previousResults 前置任务的结果（作为上下文）
 * @param options 执行选项
 * @returns 结构化执行结果
 */
export async function executeAgentTask(
  agentId: string,
  taskDescription: string,
  previousResults?: SubTaskResult[],
  options: AgentTaskExecutionOptions = {}
): Promise<SubTaskResult> {
  const startTime = Date.now()

  if (!isAgentId(agentId)) {
    return buildFailedResult(agentId, agentId, taskDescription, `Agent not found: ${agentId}`, startTime)
  }

  const typedAgentId = agentId
  const agent = getAgentById(typedAgentId)
  if (!agent) {
    return buildFailedResult(agentId, agentId, taskDescription, `Agent "${agentId}" not found in registry.`, startTime)
  }

  // ── 路径 A：有 taskId → 使用 Agent Loop（完整审计链路） ──────────
  if (options.taskId) {
    return executeViaAgentLoop(
      typedAgentId,
      agent.name,
      taskDescription,
      options.taskId,
      options.conversationId,
      previousResults,
      startTime,
    )
  }

  // ── 路径 B：无 taskId → 使用 turn loop（轻量多轮交互） ──────────
  return executeViaTurnLoop(
    typedAgentId,
    agent.name,
    taskDescription,
    previousResults,
    options.allowDirectToolExecution ?? true,
    startTime,
  )
}

// ─── 路径 A：Agent Loop ────────────────────────────────────────────

async function executeViaAgentLoop(
  agentId: AgentId,
  agentName: string,
  taskDescription: string,
  taskId: string,
  conversationId: string | undefined,
  previousResults: SubTaskResult[] | undefined,
  startTime: number,
): Promise<SubTaskResult> {
  try {
    const loopResult = await runAgentLoop({
      taskId,
      agentId,
      conversationId,
      maxTurns: 10,
      timeoutMs: 120_000,
      runtimeMode: 'sandbox_execution',
    })

    const agentResult = loopResult.agentResult

    // 写入 Memory
    await writeMemoryIfNeeded(agentId, taskDescription, agentResult.summary, agentResult.confidence)

    // 追加上下文信息
    const findings = [...agentResult.findings]
    if (previousResults && previousResults.length > 0) {
      findings.push(`Previous steps: ${previousResults.map((r) => `${r.agentName}(${r.status})`).join(', ')}`)
    }
    findings.push(`Tool calls: ${loopResult.turnResult.allToolCalls.length}, Duration: ${loopResult.durationMs}ms`)

    return {
      agentId,
      agentName,
      title: taskDescription.slice(0, 80),
      status: mapAgentStatus(agentResult.status),
      confidence: agentResult.confidence,
      summary: agentResult.summary,
      findings,
      deliverables: [],
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown'
    console.error(`[TaskExecutor/AgentLoop] Failed for agent ${agentId}:`, errorMessage)
    return buildFailedResult(agentId, agentName, taskDescription, errorMessage, startTime)
  }
}

// ─── 路径 B：Turn Loop（轻量多轮交互） ─────────────────────────────

async function executeViaTurnLoop(
  agentId: AgentId,
  agentName: string,
  taskDescription: string,
  previousResults: SubTaskResult[] | undefined,
  allowDirectToolExecution: boolean,
  startTime: number,
): Promise<SubTaskResult> {
  try {
    // 构建上下文消息
    const userParts: string[] = [`## Task`, taskDescription]

    // 注入 Evidence
    await injectEvidence(agentId, taskDescription, userParts)

    // 注入前序结果
    if (previousResults && previousResults.length > 0) {
      userParts.push('', '## Context from Previous Steps')
      for (const prev of previousResults) {
        userParts.push(`\n### ${prev.agentName} (${prev.agentId}) — ${prev.title}`)
        userParts.push(`Status: ${prev.status}`)
        userParts.push(`Summary: ${prev.summary}`)
        if (prev.findings.length > 0) {
          userParts.push(`Findings:\n${prev.findings.map((f) => `- ${f}`).join('\n')}`)
        }
      }
    }

    // 注入 Memory
    await injectMemory(agentId, userParts)

    // 工具执行指令
    if (allowDirectToolExecution) {
      userParts.push('', 'You can use tools to interact with the system. After using tools, produce your output using the produce_analysis tool.')
    } else {
      userParts.push('', 'Direct tool execution is disabled. Produce your analysis using the produce_analysis tool.')
    }

    const userMessage = userParts.join('\n')

    // 使用 Turn Loop（多轮 LLM 交互）
    const { runTurnLoop, createSandboxToolExecutor, noopToolExecutor } = await import('@/lib/agent-runtime/turn-loop')

    const toolExecutor = allowDirectToolExecution
      ? createSandboxToolExecutor(agentId)
      : noopToolExecutor

    const turnResult = await runTurnLoop(
      agentId as Exclude<AgentId, 'kelvin'>,
      'adhoc-' + Date.now(),
      [{ role: 'user', content: userMessage }],
      {
        maxTurns: 10,
        timeoutMs: 120_000,
        tools: [],
        runtimeMode: allowDirectToolExecution ? 'sandbox_execution' : 'analysis_only',
        allowToolExecution: false,
      },
      toolExecutor,
    )

    // 从 turn result 解析结果
    const findings = turnResult.allToolCalls.map(
      (tc) => `[${tc.name}] ${tc.success ? 'OK' : 'FAILED: ' + tc.error}`
    )

    // 映射被拦截的工具调用为 blockedToolRequests
    const blockedToolRequests: BlockedToolRequest[] = turnResult.blockedToolCalls.map((tc) => ({
      toolName: tc.name,
      input: tc.input,
      reason: tc.error ?? 'Tool execution blocked by policy.',
    }))

    const requiresApproval = blockedToolRequests.length > 0

    // 写入 Memory
    await writeMemoryIfNeeded(agentId, taskDescription, turnResult.finalContent.slice(0, 200), 0.6)

    // 当工具请求被拦截时，视为"完成但需要审批"，而非失败
    const hasBlockedTools = blockedToolRequests.length > 0
    const taskStatus: SubTaskResult['status'] = turnResult.success
      ? 'completed'
      : hasBlockedTools
        ? 'completed'
        : 'failed'

    return {
      agentId,
      agentName,
      title: taskDescription.slice(0, 80),
      status: taskStatus,
      confidence: turnResult.success ? 0.7 : hasBlockedTools ? 0.6 : 0.3,
      summary: turnResult.finalContent?.slice(0, 200) || 'Agent completed.',
      findings,
      deliverables: [],
      durationMs: Date.now() - startTime,
      ...(hasBlockedTools ? { blockedToolRequests, requiresApproval } : {}),
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown'
    console.error(`[TaskExecutor/TurnLoop] Failed for agent ${agentId}:`, errorMessage)
    return buildFailedResult(agentId, agentName, taskDescription, errorMessage, startTime)
  }
}

// ─── 辅助函数 ──────────────────────────────────────────────────────

function mapAgentStatus(status: string): SubTaskResult['status'] {
  switch (status) {
    case 'completed': return 'completed'
    case 'failed': return 'failed'
    case 'blocked': return 'failed'
    case 'needs_human_confirmation': return 'completed'
    default: return 'completed'
  }
}

async function injectEvidence(agentId: AgentId, taskDescription: string, userParts: string[]): Promise<void> {
  try {
    const evidenceMatches = await findRelevantEvidence(agentId, 'analysis', taskDescription, 3)
    if (evidenceMatches.length > 0) {
      userParts.push('', '## Related Evidence (read-only context)')
      for (const match of evidenceMatches) {
        userParts.push(`\n### ${match.evidence.title} (relevance: ${(match.relevanceScore * 100).toFixed(0)}%)`)
        userParts.push(`Source: ${match.evidence.source}${match.evidence.sourceId ? ` #${match.evidence.sourceId}` : ''}`)
        userParts.push(`Match: ${match.matchReason}`)
        const contentPreview = match.evidence.content.slice(0, 500)
        userParts.push(`\`\`\`\n${contentPreview}${match.evidence.content.length > 500 ? '\n...' : ''}\n\`\`\``)
      }
    }
  } catch {
    // Evidence 查询失败不影响 Agent 执行
  }
}

async function injectMemory(agentId: AgentId, userParts: string[]): Promise<void> {
  try {
    const memories = await prisma.memoryEntry.findMany({
      where: { agentId, status: 'approved' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    if (memories.length > 0) {
      userParts.push('', '## Historical Context')
      userParts.push('以下是你之前的相关工作：')
      for (const mem of memories) {
        userParts.push(`\n### ${mem.title}`)
        userParts.push(mem.content.slice(0, 500))
      }
      userParts.push('\n---\n请基于以上历史上下文，结合当前任务，给出更好的分析。')
    }
  } catch {
    // Memory 查询失败不影响 Agent 执行
  }
}

async function writeMemoryIfNeeded(
  agentId: AgentId,
  taskDescription: string,
  summary: string,
  confidence: number,
): Promise<void> {
  if (!summary) return
  try {
    await prisma.memoryEntry.create({
      data: {
        title: taskDescription.slice(0, 100),
        content: summary,
        kind: 'agent_finding',
        scope: 'project',
        agentId,
        status: 'approved',
        confidence,
        sourceType: 'agent_run',
        proposedBy: 'system',
        tagsJson: JSON.stringify([agentId]),
      },
    })
  } catch (err) {
    console.error('[TaskExecutor] Failed to write memory:', err)
  }
}

function buildFailedResult(
  agentId: string,
  agentName: string,
  taskDescription: string,
  errorMessage: string,
  startTime: number,
): SubTaskResult {
  return {
    agentId,
    agentName,
    title: taskDescription.slice(0, 80),
    status: 'failed',
    confidence: 0,
    summary: `Agent execution failed: ${errorMessage}`,
    findings: [`Error: ${errorMessage}`],
    deliverables: [],
    durationMs: Date.now() - startTime,
    error: errorMessage,
  }
}
