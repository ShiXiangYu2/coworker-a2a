/**
 * LLM-driven Agent Result Producer
 *
 * Uses Claude Sonnet to produce structured AgentResult via Tool Use.
 * Agent system prompts are built from auto-dev-framework Skill Prompts.
 * Falls back to deterministic producer on LLM failure.
 */

import { getLLMProvider } from '@/lib/llm'
import type { LLMToolDefinition } from '@/lib/llm/types'
import type { AgentId } from '@/lib/agents/types'
import { getAgentById } from '@/lib/agents/registry'
import { buildAgentSystemPrompt } from '@/lib/agents/prompts/skills'
import type { HarmonyTask } from '@/lib/harmony/types'
import type { AgentResult, AgentRuntimeMode } from './types'
import { agentRuntimeConfig } from './types'
import { produceDeterministicAgentResult } from './producer'
import { resolveAgentContext } from './context-resolver'

/**
 * 为指定 Agent 构建 System Prompt（使用 Skill Prompt + 工具调用指令）
 *
 * 根据运行时模式生成不同的指令：
 * - analysis_only：强制调用 produce_analysis 工具
 * - sandbox_execution：可以使用沙箱工具执行命令，最终调用 produce_analysis
 */
function getAgentSystemPrompt(
  agentId: Exclude<AgentId, 'kelvin'>,
  mode: AgentRuntimeMode = 'analysis_only',
): string {
  const agent = getAgentById(agentId)
  const basePrompt = agent
    ? buildAgentSystemPrompt(
        agentId,
        agent.name,
        agent.title,
        agent.description,
        agent.responsibilities,
        agent.skillPromptNames,
      )
    : `You are ${agentId}, a specialist agent of CoWorker. Analyze the task and produce structured output.`

  if (mode === 'sandbox_execution') {
    return basePrompt + `

---

## 执行模式说明（sandbox_execution）

你正在 Harmony Agent Runtime 中以 **sandbox_execution** 模式运行。

你可以使用沙箱工具执行白名单命令，然后产出结构化分析。

### 可用工具

你可以调用以下工具：
- **execute_sandbox_command**: 在沙箱内执行白名单命令（test, lint, typecheck, git-read 等）
- **run_tests**: 运行项目测试（npm test）
- **run_typecheck**: 运行 TypeScript 类型检查
- **run_lint**: 运行代码检查
- **git_status / git_diff / git_log**: Git 只读操作
- **list_directory / read_file / search_content**: 文件系统只读操作

### 禁止操作

以下操作被严格禁止：
- git push / commit / merge / checkout
- 文件写入（除 deliverables/）
- 外部 API 调用
- 部署、发布、删除

### 工作流程

1. **分析任务**：理解需要做什么
2. **使用工具**（可选）：运行测试、检查代码、查看状态等
3. **产出结果**：**必须调用 produce_analysis 工具**输出结构化分析

### 最终输出

你的最终输出必须是一个 produce_analysis 工具调用，包含：
- status: "completed" | "blocked" | "needs_human_confirmation" | "failed"
- confidence: 0.0-1.0
- summary: 一句话总结
- findings: 关键发现数组（包括工具执行结果）
- proposedChanges: 建议变更数组
- nextRecommendedAction: "show_result" | "ask_human_confirmation" | "handoff_to_agent" | "stop"
- nextReason: 推荐理由

在 findings 中包含你通过工具获取的关键信息（如测试结果、类型检查错误等）。`
  }

  // analysis_only 模式（默认）
  return basePrompt + `

---

## 执行模式说明（analysis_only）

你正在 Harmony Agent Runtime 中以 **analysis_only** 模式运行。

你的任务是：分析输入任务，然后**必须调用 produce_analysis 工具**输出结构化结果。

### 重要：如何响应

1. **不要**直接输出文本、Markdown 或 JSON
2. **不要**执行 grill-me 的追问流程（当前不是与用户对话的场景）
3. **必须**调用 produce_analysis 工具，传入完整的分析结果
4. 如果技能（如 grill-me）要求输出 JSON，请将该 JSON 放入 produce_analysis 的 \`findings\` 或 \`summary\` 字段中

### 工具调用格式

你的响应必须是一个 produce_analysis 工具调用，包含：
- status: "completed" | "blocked" | "needs_human_confirmation" | "failed"
- confidence: 0.0-1.0
- summary: 一句话总结你的分析
- findings: 关键发现数组
- proposedChanges: 建议变更数组
- nextRecommendedAction: "show_result" | "ask_human_confirmation" | "request_more_context" | "handoff_to_agent" | "stop"
- nextReason: 推荐理由
- suggestedNextAgentId: （如适用）建议的下一个代理 ID

再次强调：你的唯一输出应该是 produce_analysis 工具调用，而不是任何文本内容。`
}

const LLM_SAFETY_NOTE =
  'LLM-driven Agent Runtime produces structured analysis only. No tools, commands, file edits, PRs, deploys, deletes, or memory writes executed.'

const produceAnalysisTool: LLMToolDefinition = {
  name: 'produce_analysis',
  description:
    '【必须调用】输出你的结构化分析结果。你是 Harmony Agent Runtime 的 analysis_only 代理，你的唯一职责是分析任务并调用此工具输出结果。不要输出任何文本，只调用此工具。',
  input_schema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['completed', 'blocked', 'needs_human_confirmation', 'failed'],
        description: 'The status of the analysis.',
      },
      confidence: {
        type: 'number',
        description: 'Confidence in the analysis (0.0 to 1.0).',
      },
      summary: {
        type: 'string',
        description: 'A concise summary of the analysis findings.',
      },
      findings: {
        type: 'array',
        description: 'Key findings from the analysis.',
      },
      proposedChanges: {
        type: 'array',
        description: 'Proposed changes or actions.',
      },
      nextRecommendedAction: {
        type: 'string',
        enum: ['show_result', 'ask_human_confirmation', 'request_more_context', 'handoff_to_agent', 'stop'],
        description: 'The recommended next action.',
      },
      nextReason: {
        type: 'string',
        description: 'Reason for the recommended next action.',
      },
      suggestedNextAgentId: {
        type: 'string',
        enum: ['elon', 'jobs', 'linus', 'turing', 'bezos', 'kelvin'],
        description: 'Suggested next agent for handoff (if applicable).',
      },
    },
    required: ['status', 'confidence', 'summary', 'findings', 'proposedChanges', 'nextRecommendedAction', 'nextReason'],
  },
}

function buildAgentResultFromToolUse(
  toolInput: Record<string, unknown>
): AgentResult {
  const status = (toolInput.status as AgentResult['status']) ?? 'completed'
  const confidence = typeof toolInput.confidence === 'number' ? toolInput.confidence : 0.75
  const summary = (toolInput.summary as string) ?? 'Agent analysis completed.'
  const findings = Array.isArray(toolInput.findings)
    ? toolInput.findings.map(String)
    : []
  const proposedChanges = Array.isArray(toolInput.proposedChanges)
    ? (toolInput.proposedChanges as Array<Record<string, unknown>>).map((c) => ({
        type: (c.type as AgentResult['proposedChanges'][number]['type']) ?? 'other',
        title: (c.title as string) ?? 'Analysis proposal',
        description: (c.description as string) ?? '',
        riskLevel: (c.riskLevel as 'low' | 'medium' | 'high') ?? 'low',
      }))
    : []
  const nextRecommendedAction =
    (toolInput.nextRecommendedAction as AgentResult['next']['recommendedAction']) ?? 'show_result'
  const nextReason = (toolInput.nextReason as string) ?? 'Analysis complete.'
  const suggestedNextAgentId = toolInput.suggestedNextAgentId as AgentId | undefined

  const needsHumanConfirmation = status === 'needs_human_confirmation'

  return {
    status,
    confidence: Math.max(0, Math.min(1, confidence)),
    summary,
    findings,
    proposedChanges,
    next: {
      recommendedAction: nextRecommendedAction,
      reason: nextReason,
      suggestedNextAgentId,
    },
    sideEffects: {
      filesChanged: [],
      branchesCreated: [],
      prsCreated: [],
      issuesUpdated: [],
    },
    needsHumanConfirmation,
    safetyNotes: [LLM_SAFETY_NOTE],
  }
}

/**
 * LLM-driven Agent Result producer — 多轮对话版本
 *
 * 使用 runTurnLoop 进行多轮 LLM 交互，支持工具调用链。
 * 适用于需要多步推理的复杂任务。
 *
 * 与 produceLLMAgentResult 的区别：
 *   - produceLLMAgentResult：单轮调用，强制 produce_analysis 输出
 *   - 本函数：多轮循环，LLM 可以调用任意工具后最终产出分析
 */
/**
 * LLM-driven Agent Result producer — 多轮对话版本
 *
 * 使用 runTurnLoop 进行多轮 LLM 交互，支持工具调用链。
 * 根据运行时模式自动选择执行器：
 * - analysis_only：noopToolExecutor（不执行任何操作）
 * - sandbox_execution：sandboxToolExecutor（沙箱内执行白名单命令）
 */
export async function produceLLMAgentResultWithTurnLoop(
  task: HarmonyTask,
  context?: unknown,
): Promise<AgentResult> {
  void context
  const agentId = task.targetAgentId
  const runtimeMode = agentRuntimeConfig.mode

  if (!agentId || agentId === 'kelvin') {
    return produceDeterministicAgentResult(task)
  }

  try {
    const { runTurnLoop, noopToolExecutor, createSandboxToolExecutor } = await import('./turn-loop')
    const { resolveAgentContext } = await import('./context-resolver')

    // 注入多 Agent 协作上下文
    const resolvedContext = await resolveAgentContext(
      agentId,
      task.id,
      task.conversationId,
    )
    if (resolvedContext) {
      console.log(
        `[LLM-Producer/TurnLoop] Context available: ${resolvedContext.stats.completedResults} results, ${resolvedContext.stats.a2aMessages} messages`,
      )
    }

    // 根据运行时模式选择执行器
    const toolExecutor = runtimeMode === 'sandbox_execution'
      ? createSandboxToolExecutor(agentId)
      : noopToolExecutor

    const userMessage = [
      `## Task`,
      `Title: ${task.title}`,
      `Description: ${task.description}`,
      `Type: ${task.type}`,
      `Route Reason: ${task.reason}`,
      task.targetAgentId ? `Assigned Agent: ${task.targetAgentId}` : '',
      '',
      runtimeMode === 'sandbox_execution'
        ? 'Execute tools as needed (tests, typecheck, lint, etc.), then produce your analysis.'
        : 'Analyze this task. You may use tools if available, then produce your analysis.',
    ]
      .filter(Boolean)
      .join('\n')

    const turnResult = await runTurnLoop(
      agentId as Exclude<AgentId, 'kelvin'>,
      task.id,
      [{ role: 'user', content: userMessage }],
      {
        maxTurns: runtimeMode === 'sandbox_execution' ? 8 : 5,
        timeoutMs: runtimeMode === 'sandbox_execution' ? 120_000 : 60_000,
        tools: [], // 使用 Agent 核心工具 + 沙箱工具（由 runtimeMode 控制）
        runtimeMode,
      },
      toolExecutor,
    )

    // 从 turn-loop 结果中提取 AgentResult
    if (turnResult.success && turnResult.finalContent) {
      const parsed = tryParseAgentResult(turnResult.finalContent)
      if (parsed) {
        // 记录工具执行信息
        if (turnResult.allToolCalls.length > 0) {
          const toolSummary = turnResult.allToolCalls.map(
            (tc) => `[${tc.name}] ${tc.success ? 'OK' : 'FAILED: ' + tc.error}`,
          )
          parsed.findings.push(...toolSummary)
        }
        parsed.contextSnapshot = resolvedContext?.stats
        return parsed
      }
    }

    // 如果 turn-loop 没有产出有效结果，回退到单轮模式
    console.log('[LLM-Producer/TurnLoop] No valid result from turn loop, falling back to single-turn')
    return produceLLMAgentResult(task, context)
  } catch (error) {
    console.log('[LLM-Producer/TurnLoop] Error, falling back to single-turn:', error)
    return produceLLMAgentResult(task, context)
  }
}

/**
 * LLM-driven Agent Result producer.
 * Uses Claude Sonnet with Tool Use for structured output.
 *
 * 根据运行时模式自动选择执行路径：
 * - sandbox_execution：使用 TurnLoop 多轮执行（含沙箱工具）
 * - analysis_only：单轮 produce_analysis 调用
 *
 * Falls back to deterministic producer on any error.
 */
export async function produceLLMAgentResult(
  task: HarmonyTask,
  context?: unknown
): Promise<AgentResult> {
  void context
  const agentId = task.targetAgentId
  const runtimeMode = agentRuntimeConfig.mode

  // Kelvin always requires human confirmation
  if (!agentId || agentId === 'kelvin') {
    return produceDeterministicAgentResult(task)
  }

  // sandbox_execution 模式：使用 TurnLoop 多轮执行
  if (runtimeMode === 'sandbox_execution') {
    return produceLLMAgentResultWithTurnLoop(task, context)
  }

  try {
    const provider = getLLMProvider()
    let systemPrompt = getAgentSystemPrompt(agentId, runtimeMode)

    // 注入多 Agent 协作上下文
    const resolvedContext = await resolveAgentContext(
      agentId,
      task.id,
      task.conversationId
    )
    if (resolvedContext) {
      systemPrompt += `\n\n---\n\n## 相关上下文\n\n以下是同一对话中其他 Agent 的分析结果和相关记忆，供你参考。请注意：这些是历史记录，不代表当前任务的状态。\n\n${resolvedContext.context}`
      console.log(`[LLM-Producer] Injected context: ${resolvedContext.stats.completedResults} results, ${resolvedContext.stats.a2aMessages} messages, ${resolvedContext.stats.memoryEntries} memories (${resolvedContext.stats.totalLength} chars)`)
    }

    const userMessage = [
      `## Task`,
      `Title: ${task.title}`,
      `Description: ${task.description}`,
      `Type: ${task.type}`,
      `Route Reason: ${task.reason}`,
      task.targetAgentId ? `Assigned Agent: ${task.targetAgentId}` : '',
      '',
      'Produce your analysis using the produce_analysis tool.',
    ]
      .filter(Boolean)
      .join('\n')

    const result = await provider.chat(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      {
        tools: [produceAnalysisTool],
        maxTokens: 4096,
      }
    )

    // Debug logging
    console.log('[LLM-Producer] agentId:', agentId)
    console.log('[LLM-Producer] toolUse:', JSON.stringify(result.toolUse))
    console.log('[LLM-Producer] content preview:', result.content?.substring(0, 100))

    if (result.toolUse && result.toolUse.name === 'produce_analysis') {
      const agentResult = buildAgentResultFromToolUse(result.toolUse.input)
      // Always ensure safety note is present
      if (!agentResult.safetyNotes.some((n) => n.includes('analysis only'))) {
        agentResult.safetyNotes.push(LLM_SAFETY_NOTE)
      }
      // 记录上下文快照
      if (resolvedContext) {
        agentResult.contextSnapshot = resolvedContext.stats
      }
      return agentResult
    }

    // If no tool use, fall back to deterministic
    console.log('[LLM-Producer] Falling back to deterministic (no tool use)')
    return produceDeterministicAgentResult(task)
  } catch (error) {
    // On any LLM error, fall back to deterministic behavior
    console.log('[LLM-Producer] LLM error, falling back to deterministic:', error)
    return produceDeterministicAgentResult(task)
  }
}

// ─── 辅助函数 ──────────────────────────────────────────────────────

/**
 * 尝试从 LLM 输出文本中解析 AgentResult JSON
 *
 * LLM 可能输出包含 JSON 的 Markdown 文本，这里尝试提取并解析
 */
function tryParseAgentResult(text: string): AgentResult | null {
  if (!text) return null

  // 尝试直接解析
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    if (isValidAgentResultShape(parsed)) {
      return parsed as unknown as AgentResult
    }
  } catch {
    // 不是纯 JSON，继续尝试从 Markdown 中提取
  }

  // 尝试从 ```json ... ``` 代码块中提取
  const jsonBlockMatch = text.match(/```json\s*\n?([\s\S]*?)\n?\s*```/)
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1]) as Record<string, unknown>
      if (isValidAgentResultShape(parsed)) {
        return parsed as unknown as AgentResult
      }
    } catch {
      // 解析失败
    }
  }

  // 尝试从 { ... } 中提取
  const objectMatch = text.match(/\{[\s\S]*"status"[\s\S]*\}/)
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]) as Record<string, unknown>
      if (isValidAgentResultShape(parsed)) {
        return parsed as unknown as AgentResult
      }
    } catch {
      // 解析失败
    }
  }

  return null
}

/**
 * 检查对象是否具有 AgentResult 的基本形状
 */
function isValidAgentResultShape(obj: Record<string, unknown>): boolean {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.status === 'string' &&
    typeof obj.confidence === 'number' &&
    typeof obj.summary === 'string' &&
    Array.isArray(obj.findings) &&
    Array.isArray(obj.proposedChanges) &&
    typeof obj.next === 'object' &&
    obj.next !== null &&
    typeof (obj.next as Record<string, unknown>).recommendedAction === 'string'
  )
}
