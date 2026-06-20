/**
 * Agent Loop — Agent 自主推理-行动循环
 *
 * 核心流程：
 *   构建上下文 → 调用 LLM → 如果返回 tool_use → 执行工具 →
 *   将 tool_result 注入对话 → 下一轮，直到 LLM 不再调用工具或达到上限
 *
 * 与 turn-loop.ts 的区别：
 *   - turn-loop：通用多轮循环，不关心审计、上下文注入、结果解析
 *   - agent-loop：面向 Agent 任务的完整循环，包含上下文注入、审计记录、结果解析
 *
 * 与 llm-producer.ts 的区别：
 *   - llm-producer：单轮调用，强制 produce_analysis 工具输出
 *   - agent-loop：多轮循环，Agent 可以自主使用工具后产出分析
 *
 * 安全边界：
 *   - 工具执行由 toolExecutor 控制（sandbox 或 noop）
 *   - 每轮工具调用记录审计事件
 *   - 超时和 maxTurns 双重保护
 */

import { prisma } from '@/lib/prisma'
import type { AgentId } from '@/lib/agents/types'
import { resolveAgentContext } from './context-resolver'
import { runTurnLoop, noopToolExecutor, createSandboxToolExecutor } from './turn-loop'
import type { AgentResult, AgentRuntimeMode } from './types'
import { searchMemory } from '@/lib/memory/embedding'
import type { ToolExecutor } from './turn-loop'
import {
  publishStepStarted,
  publishStepCompleted,
  publishStepFailed,
  publishTaskCompleted,
  publishToolCalled,
} from '@/lib/realtime/event-bus'
import { recordRoutingOutcome } from '@/lib/learning/feedback-loop'
import { checkBudget, recordTokenUsage } from '@/lib/scheduler/token-budget'
import { checkRateLimit, recordRequest } from '@/lib/scheduler/rate-limiter'
import { recordError, checkKnownErrorPattern } from '@/lib/learning/error-patterns'
import { recordSuccess, getExecutionAdvice } from '@/lib/learning/best-practices'

// ─── 类型定义 ──────────────────────────────────────────────────────

export interface AgentLoopInput {
  /** 任务 ID（HarmonyTask） */
  taskId: string
  /** Agent ID */
  agentId: AgentId
  /** 对话 ID（用于上下文注入） */
  conversationId?: string | null
  /** 最大对话轮数（默认 10） */
  maxTurns?: number
  /** 超时毫秒数（默认 120s） */
  timeoutMs?: number
  /** 运行时模式（默认 sandbox_execution） */
  runtimeMode?: AgentRuntimeMode
}

export interface AgentLoopResult {
  /** Agent 分析结果 */
  agentResult: AgentResult
  /** Turn loop 原始结果 */
  turnResult: {
    turns: number
    allToolCalls: Array<{ name: string; success: boolean; error?: string }>
    totalDurationMs: number
    finishReason: string
  }
  /** 审计事件 ID 列表 */
  auditEventIds: string[]
  /** 总耗时毫秒 */
  durationMs: number
}

// ─── 核心循环 ──────────────────────────────────────────────────────

/**
 * 运行 Agent Loop
 *
 * 完整流程：加载任务 → 构建上下文 → 构建 prompt → 运行 turn loop → 解析结果 → 记录审计
 */
export async function runAgentLoop(input: AgentLoopInput): Promise<AgentLoopResult> {
  const startTime = Date.now()
  const auditEventIds: string[] = []

  // Kelvin 不参与 Agent Loop
  if (input.agentId === 'kelvin') {
    return buildKelvinResult()
  }

  // 1. 加载任务
  const task = await prisma.harmonyTask.findUnique({
    where: { id: input.taskId },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      reason: true,
      targetAgentId: true,
      conversationId: true,
    },
  })

  if (!task) {
    return buildErrorResult(input.agentId, 'Task not found', auditEventIds, startTime)
  }

  // 0. 资源检查：Token 预算 + 限速
  const estimatedTokens = 10_000 // 预估 10K tokens
  const budgetError = checkBudget(input.agentId, input.taskId, estimatedTokens)
  if (budgetError) {
    console.warn(`[AgentLoop] Budget exceeded for ${input.agentId}: ${budgetError}`)
    return buildErrorResult(input.agentId, `Budget exceeded: ${budgetError}`, auditEventIds, startTime)
  }

  const rateLimitWait = checkRateLimit(estimatedTokens)
  if (rateLimitWait !== null && rateLimitWait > 10_000) {
    console.warn(`[AgentLoop] Rate limit hit for ${input.agentId}, wait: ${rateLimitWait}ms`)
    return buildErrorResult(input.agentId, `Rate limit exceeded, estimated wait: ${rateLimitWait}ms`, auditEventIds, startTime)
  }

  // 记录请求
  recordRequest(estimatedTokens)

  // 1. 检查已知错误模式（自我改进：避免重复犯错）
  const knownError = checkKnownErrorPattern(input.agentId, task.type, '')
  if (knownError) {
    console.log(`[AgentLoop] Known error pattern detected for ${input.agentId}: ${knownError.advice}`)
  }

  // 2. 获取执行建议（自我改进：复用成功经验）
  const executionAdvice = getExecutionAdvice(input.agentId, task.type)
  if (executionAdvice) {
    console.log(`[AgentLoop] Execution advice for ${input.agentId}: ${executionAdvice.advice}`)
  }

  // 发布：Agent 开始执行
  publishStepStarted(input.agentId, input.taskId, 'agent_loop_start')

  try {
    // 2. 注入协作上下文
    const resolvedContext = await resolveAgentContext(
      input.agentId,
      input.taskId,
      input.conversationId ?? task.conversationId,
    )

    // 4. 构建 user message
    const userMessage = buildUserMessage(task, input.agentId, resolvedContext)

    // 5. 选择 tool executor（sandbox/noop + memory search）
    const runtimeMode = input.runtimeMode ?? 'sandbox_execution'
    const baseExecutor = runtimeMode === 'sandbox_execution'
      ? createSandboxToolExecutor(input.agentId)
      : noopToolExecutor
    const toolExecutor = createCompositeExecutor(baseExecutor, input.agentId)

    // 6. 运行 turn loop
    const turnResult = await runTurnLoop(
      input.agentId as Exclude<AgentId, 'kelvin'>,
      input.taskId,
      [{ role: 'user', content: userMessage }],
      {
        maxTurns: input.maxTurns ?? 10,
        timeoutMs: input.timeoutMs ?? 120_000,
        tools: [],
        runtimeMode,
      },
      toolExecutor,
    )

    // 7. 记录审计事件 + 发布实时事件：工具调用
    for (const toolCall of turnResult.allToolCalls) {
      const eventId = await recordToolCallAudit(
        input.taskId,
        input.agentId,
        toolCall.name,
        toolCall.success ?? false,
        toolCall.error,
      )
      if (eventId) auditEventIds.push(eventId)

      // 发布实时事件
      publishToolCalled(input.agentId, input.taskId, toolCall.name, toolCall.success ?? false)
    }

    // 8. 解析 AgentResult
    const agentResult = parseAgentResult(turnResult, input.agentId)

    // 9. 发布实时事件：任务完成
    publishTaskCompleted(input.agentId, input.taskId, agentResult.summary, agentResult.confidence)

    // 10. 记录审计事件：循环完成
    const completeEventId = await recordCompletionAudit(
      input.taskId,
      input.agentId,
      agentResult,
      turnResult.finishReason,
      turnResult.allToolCalls.length,
    )
    if (completeEventId) auditEventIds.push(completeEventId)

    // 11. 记录 token 使用量到资源管理器
    const totalToolCalls = turnResult.allToolCalls.length
    recordTokenUsage(input.agentId, {
      inputTokens: turnResult.totalUsage.inputTokens || estimatedTokens,
      outputTokens: turnResult.totalUsage.outputTokens || Math.ceil(totalToolCalls * 500),
      totalTokens: (turnResult.totalUsage.inputTokens || estimatedTokens) + (turnResult.totalUsage.outputTokens || Math.ceil(totalToolCalls * 500)),
      estimatedCostUsd: 0, // 由 token-budget 模块计算
    }, {
      taskId: input.taskId,
      provider: process.env.LLM_PROVIDER ?? 'mock',
      model: process.env.CLAUDE_MODEL ?? 'mock',
      taskType: task.type,
    })

    // 12. 记录成功到最佳实践提取器（自我改进：提取成功模式）
    if (agentResult.status === 'completed') {
      recordSuccess(
        input.agentId,
        task.type,
        agentResult.confidence,
        Date.now() - startTime,
        turnResult.allToolCalls.map((tc) => tc.name),
        agentResult.summary,
      )
    }

    // 13. 记录到反馈闭环（用于性能分析和路由调优）
    recordRoutingOutcome({
      agentId: input.agentId,
      taskType: task.type,
      routeConfidence: agentResult.confidence,
      executionStatus: agentResult.status === 'completed' ? 'completed'
        : agentResult.status === 'failed' ? 'failed'
        : agentResult.status === 'blocked' ? 'blocked'
        : 'completed',
      executionConfidence: agentResult.confidence,
      durationMs: Date.now() - startTime,
      matchedSignals: [],
    })

    return {
      agentResult,
      turnResult: {
        turns: turnResult.turns.length,
        allToolCalls: turnResult.allToolCalls.map((tc) => ({
          name: tc.name,
          success: tc.success ?? false,
          error: tc.error,
        })),
        totalDurationMs: turnResult.totalDurationMs,
        finishReason: turnResult.finishReason,
      },
      auditEventIds,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[AgentLoop] Error for agent ${input.agentId}:`, errorMessage)
    publishStepFailed(input.agentId, input.taskId, 'agent_loop', errorMessage)

    // 记录失败到错误模式学习器（自我改进：避免重复犯错）
    recordError(input.agentId, task?.type ?? 'unknown', errorMessage, false)

    // 记录失败到反馈闭环
    recordRoutingOutcome({
      agentId: input.agentId,
      taskType: task?.type ?? 'unknown',
      routeConfidence: 0,
      executionStatus: 'failed',
      executionConfidence: 0,
      durationMs: Date.now() - startTime,
      matchedSignals: [],
    })

    return buildErrorResult(input.agentId, errorMessage, auditEventIds, startTime)
  }
}

// ─── 辅助函数 ──────────────────────────────────────────────────────

/**
 * 构建 user message（任务 + 上下文）
 */
function buildUserMessage(
  task: { title: string; description: string; type: string; reason: string; targetAgentId?: string | null },
  agentId: AgentId,
  resolvedContext: { context: string; stats: Record<string, number> } | null,
): string {
  const parts: string[] = [
    `## Task`,
    `Title: ${task.title}`,
    `Description: ${task.description}`,
    `Type: ${task.type}`,
    `Route Reason: ${task.reason}`,
    task.targetAgentId ? `Assigned Agent: ${task.targetAgentId}` : '',
    '',
    'Analyze this task. Use tools if available, then produce your analysis using the produce_analysis tool.',
  ]

  if (resolvedContext) {
    parts.push('', '## Related Context', resolvedContext.context)
  }

  return parts.filter(Boolean).join('\n')
}

/**
 * 从 turn loop 结果解析 AgentResult
 *
 * 优先级：
 * 1. produce_analysis 工具调用
 * 2. JSON 解析 finalContent
 * 3. Markdown 代码块中提取 JSON
 * 4. 回退到文本摘要
 */
function parseAgentResult(
  turnResult: { finalContent: string; allToolCalls: Array<{ name: string; output?: unknown; success?: boolean; error?: string }>; finishReason: string },
  agentId: AgentId,
): AgentResult {
  // 1. 检查是否有 produce_analysis 工具调用
  const produceAnalysisCall = turnResult.allToolCalls.find((tc) => tc.name === 'produce_analysis')
  if (produceAnalysisCall?.output && typeof produceAnalysisCall.output === 'object') {
    const parsed = buildAgentResultFromToolUse(produceAnalysisCall.output as Record<string, unknown>)
    if (parsed) {
      // 追加工具执行信息到 findings
      const toolSummary = turnResult.allToolCalls
        .filter((tc) => tc.name !== 'produce_analysis')
        .map((tc) => `[${tc.name}] ${tc.success ? 'OK' : 'FAILED: ' + (tc.error ?? 'unknown')}`)
      if (toolSummary.length > 0) {
        parsed.findings.push(...toolSummary)
      }
      return parsed
    }
  }

  // 2. 尝试解析 finalContent 为 JSON
  if (turnResult.finalContent) {
    const parsed = tryParseAgentResult(turnResult.finalContent)
    if (parsed) return parsed
  }

  // 3. 回退到文本摘要
  return {
    status: turnResult.finishReason === 'error' ? 'failed' : 'completed',
    confidence: 0.5,
    summary: turnResult.finalContent?.slice(0, 200) || 'Agent loop completed without structured output.',
    findings: turnResult.allToolCalls.map(
      (tc) => `[${tc.name}] ${tc.success ? 'OK' : 'FAILED: ' + (tc.error ?? 'unknown')}`,
    ),
    proposedChanges: [],
    next: {
      recommendedAction: 'show_result',
      reason: 'Agent loop completed.',
    },
    sideEffects: { filesChanged: [], branchesCreated: [], prsCreated: [], issuesUpdated: [] },
    needsHumanConfirmation: false,
    safetyNotes: [`Agent ${agentId} completed ${turnResult.allToolCalls.length} tool calls.`],
  }
}

/**
 * 从 produce_analysis 工具调用构建 AgentResult
 */
function buildAgentResultFromToolUse(
  toolInput: Record<string, unknown>,
): AgentResult | null {
  if (!toolInput || typeof toolInput !== 'object') return null
  if (typeof toolInput.status !== 'string' || typeof toolInput.confidence !== 'number') return null

  return {
    status: toolInput.status as AgentResult['status'],
    confidence: Math.max(0, Math.min(1, toolInput.confidence)),
    summary: (toolInput.summary as string) || 'Analysis completed.',
    findings: Array.isArray(toolInput.findings) ? toolInput.findings.map(String) : [],
    proposedChanges: Array.isArray(toolInput.proposedChanges)
      ? (toolInput.proposedChanges as Array<Record<string, unknown>>).map((c) => ({
          type: (c.type as AgentResult['proposedChanges'][number]['type']) ?? 'other',
          title: (c.title as string) ?? 'Analysis proposal',
          description: (c.description as string) ?? '',
          riskLevel: (c.riskLevel as 'low' | 'medium' | 'high') ?? 'low',
        }))
      : [],
    next: {
      recommendedAction: (toolInput.nextRecommendedAction as AgentResult['next']['recommendedAction']) ?? 'show_result',
      reason: (toolInput.nextReason as string) ?? 'Analysis complete.',
      suggestedNextAgentId: toolInput.suggestedNextAgentId as AgentId | undefined,
    },
    sideEffects: { filesChanged: [], branchesCreated: [], prsCreated: [], issuesUpdated: [] },
    needsHumanConfirmation: toolInput.status === 'needs_human_confirmation',
    safetyNotes: [],
  }
}

/**
 * 从文本中尝试解析 AgentResult JSON
 */
function tryParseAgentResult(text: string): AgentResult | null {
  if (!text) return null

  // 直接解析
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    if (isValidAgentResultShape(parsed)) return parsed as unknown as AgentResult
  } catch { /* not pure JSON */ }

  // 从 ```json ... ``` 中提取
  const jsonBlockMatch = text.match(/```json\s*\n?([\s\S]*?)\n?\s*```/)
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1]) as Record<string, unknown>
      if (isValidAgentResultShape(parsed)) return parsed as unknown as AgentResult
    } catch { /* parse failed */ }
  }

  // 从 { ... } 中提取
  const objectMatch = text.match(/\{[\s\S]*"status"[\s\S]*\}/)
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]) as Record<string, unknown>
      if (isValidAgentResultShape(parsed)) return parsed as unknown as AgentResult
    } catch { /* parse failed */ }
  }

  return null
}

function isValidAgentResultShape(obj: Record<string, unknown>): boolean {
  return (
    typeof obj === 'object' && obj !== null &&
    typeof obj.status === 'string' &&
    typeof obj.confidence === 'number' &&
    typeof obj.summary === 'string' &&
    Array.isArray(obj.findings) &&
    typeof obj.next === 'object' && obj.next !== null &&
    typeof (obj.next as Record<string, unknown>).recommendedAction === 'string'
  )
}

// ─── 复合工具执行器 ────────────────────────────────────────────────

/**
 * 创建复合工具执行器
 *
 * 在基础执行器（sandbox/noop）之上，添加 search_memory 工具支持。
 * Agent 可以在推理过程中主动检索历史记忆。
 */
function createCompositeExecutor(
  baseExecutor: ToolExecutor,
  agentId: AgentId,
): ToolExecutor {
  return async (
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<{ output: unknown; success: boolean; error?: string }> => {
    // search_memory 工具：Agent 主动检索历史记忆
    if (toolName === 'search_memory') {
      return handleSearchMemory(input, agentId)
    }

    // 其他工具：委托给基础执行器
    return baseExecutor(toolName, input)
  }
}

/**
 * 处理 search_memory 工具调用
 *
 * 使用 TF-IDF 语义检索查找相关记忆，返回给 Agent 作为上下文。
 */
async function handleSearchMemory(
  input: Record<string, unknown>,
  agentId: AgentId,
): Promise<{ output: unknown; success: boolean; error?: string }> {
  const query = typeof input.query === 'string' ? input.query : ''
  const limit = typeof input.limit === 'number' ? Math.min(input.limit, 10) : 5

  if (!query.trim()) {
    return {
      output: { results: [], message: 'Query is empty.' },
      success: true,
    }
  }

  try {
    const results = await searchMemory(query, {
      limit,
      minScore: 0.1,
      activeOnly: true,
      // 优先搜索当前任务和当前 Agent 的记忆
      agentId: agentId as AgentId,
    })

    const formatted = results.map((r) => ({
      title: r.entry.title,
      content: r.entry.content.slice(0, 500),
      kind: r.entry.kind,
      score: r.score,
      matchType: r.matchType,
      agentId: r.entry.agentId,
      createdAt: r.entry.createdAt,
    }))

    return {
      output: {
        query,
        results: formatted,
        total: formatted.length,
        message: `Found ${formatted.length} relevant memories.`,
      },
      success: true,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      output: { query, results: [], message: `Memory search failed: ${errorMessage}` },
      success: false,
      error: errorMessage,
    }
  }
}

// ─── 审计事件 ──────────────────────────────────────────────────────

async function recordToolCallAudit(
  taskId: string,
  agentId: AgentId,
  toolName: string,
  success: boolean,
  error?: string,
): Promise<string | null> {
  try {
    const event = await prisma.harmonyAuditEvent.create({
      data: {
        taskId,
        eventType: 'agent_loop.tool_call',
        actorType: 'agent',
        actorId: agentId,
        reason: `Agent ${agentId} called tool "${toolName}" — ${success ? 'success' : 'failed'}`,
        payloadJson: JSON.stringify({
          toolName,
          success,
          error: error ?? null,
          source: 'agent_loop',
        }),
      },
    })
    return event.id
  } catch {
    return null
  }
}

async function recordCompletionAudit(
  taskId: string,
  agentId: AgentId,
  agentResult: AgentResult,
  finishReason: string,
  toolCallCount: number,
): Promise<string | null> {
  try {
    const event = await prisma.harmonyAuditEvent.create({
      data: {
        taskId,
        eventType: 'agent_loop.completed',
        actorType: 'agent',
        actorId: agentId,
        afterStatus: agentResult.status,
        reason: `Agent loop completed: ${finishReason}, ${toolCallCount} tool calls, status=${agentResult.status}`,
        payloadJson: JSON.stringify({
          finishReason,
          toolCallCount,
          status: agentResult.status,
          confidence: agentResult.confidence,
          summary: agentResult.summary.slice(0, 200),
          source: 'agent_loop',
        }),
      },
    })
    return event.id
  } catch {
    return null
  }
}

// ─── 特殊结果构建 ──────────────────────────────────────────────────

function buildKelvinResult(): AgentLoopResult {
  return {
    agentResult: {
      status: 'needs_human_confirmation',
      confidence: 1,
      summary: 'Kelvin is the human operator and does not participate in Agent Loop execution.',
      findings: ['Kelvin requires human intervention.'],
      proposedChanges: [],
      next: { recommendedAction: 'ask_human_confirmation', reason: 'Kelvin is the human operator.' },
      sideEffects: { filesChanged: [], branchesCreated: [], prsCreated: [], issuesUpdated: [] },
      needsHumanConfirmation: true,
      safetyNotes: ['Kelvin is the human operator.'],
    },
    turnResult: { turns: 0, allToolCalls: [], totalDurationMs: 0, finishReason: 'error' },
    auditEventIds: [],
    durationMs: 0,
  }
}

function buildErrorResult(
  agentId: AgentId,
  errorMessage: string,
  auditEventIds: string[],
  startTime: number,
): AgentLoopResult {
  return {
    agentResult: {
      status: 'failed',
      confidence: 0,
      summary: `Agent loop failed: ${errorMessage}`,
      findings: [`Agent: ${agentId}`, `Error: ${errorMessage}`],
      proposedChanges: [],
      next: { recommendedAction: 'ask_human_confirmation', reason: errorMessage },
      sideEffects: { filesChanged: [], branchesCreated: [], prsCreated: [], issuesUpdated: [] },
      needsHumanConfirmation: true,
      safetyNotes: [`Agent loop failed for ${agentId}.`],
    },
    turnResult: { turns: 0, allToolCalls: [], totalDurationMs: 0, finishReason: 'error' },
    auditEventIds,
    durationMs: Date.now() - startTime,
  }
}
