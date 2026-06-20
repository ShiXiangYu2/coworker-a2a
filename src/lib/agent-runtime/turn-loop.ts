/**
 * Agent Turn Loop — Agent 多轮对话循环
 *
 * 来源：对齐 claude-code src/query.ts + src/QueryEngine.ts 的核心循环模式
 *
 * 核心流程：
 *   构建 system prompt → 调用 LLM → 如果返回 tool_use → 执行工具 →
 *   将 tool_result 注入对话 → 下一轮，直到 LLM 不再调用工具或达到上限
 *
 * 与 llm-producer.ts 的区别：
 *   - llm-producer：单轮调用，强制 produce_analysis 工具输出
 *   - turn-loop：多轮循环，支持任意工具调用链
 */

import { getLLMProvider } from '@/lib/llm'
import type { ChatMessage, LLMToolDefinition } from '@/lib/llm/types'
import type { AgentId } from '@/lib/agents/types'
import { getAgentById } from '@/lib/agents/registry'
import { buildAgentSystemPrompt } from '@/lib/agents/prompts/skills'
import { getCoreToolsForAgent, isToolAllowedForAgent } from '@/lib/tools/registry'
import {
  createSandboxToolExecutor as createSandboxExecutor,
  SANDBOX_TOOL_DEFINITIONS,
} from '@/lib/tools/sandbox-tool-executor'
import type { AgentRuntimeMode } from './types'

// ─── 类型定义 ──────────────────────────────────────────────────────

export interface TurnLoopConfig {
  /** 最大对话轮数（防止无限循环） */
  maxTurns: number
  /** 超时毫秒数 */
  timeoutMs: number
  /** 本轮可用的工具 ID 列表（为空则使用 Agent 核心工具） */
  tools: string[]
  /** LLM 温度 */
  temperature?: number
  /** 最大输出 token 数 */
  maxTokens?: number
  /** 运行时模式（影响工具可用性） */
  runtimeMode?: AgentRuntimeMode
  /** 是否允许执行工具调用（false 时工具调用被拦截并记录为 blocked） */
  allowToolExecution?: boolean
}

export interface TurnToolCall {
  /** 工具名称 */
  name: string
  /** 工具输入 */
  input: Record<string, unknown>
  /** 工具执行结果（执行后填充） */
  output?: unknown
  /** 执行是否成功 */
  success?: boolean
  /** 执行错误信息 */
  error?: string
}

export interface TurnResult {
  /** 轮次索引（从 0 开始） */
  turnIndex: number
  /** 角色 */
  role: 'assistant' | 'tool'
  /** 文本内容（tool_use 时为空） */
  content: string
  /** 工具调用列表（仅 assistant 轮次可能有） */
  toolCalls?: TurnToolCall[]
  /** token 用量 */
  usage: { inputTokens: number; outputTokens: number }
  /** 是否为最终轮次 */
  finished: boolean
  /** 终止原因 */
  finishReason: 'stop' | 'max_turns' | 'timeout' | 'error' | 'tool_limit'
  /** 耗时毫秒 */
  durationMs: number
}

export interface TurnLoopResult {
  /** Agent ID */
  agentId: AgentId
  /** 所有轮次结果 */
  turns: TurnResult[]
  /** 最终文本输出（最后一轮 assistant 的 content） */
  finalContent: string
  /** 所有工具调用的扁平列表 */
  allToolCalls: TurnToolCall[]
  /** 被拦截的工具调用列表（allowToolExecution=false 时填充） */
  blockedToolCalls: TurnToolCall[]
  /** 总 token 用量 */
  totalUsage: { inputTokens: number; outputTokens: number }
  /** 总耗时毫秒 */
  totalDurationMs: number
  /** 是否成功完成 */
  success: boolean
  /** 终止原因 */
  finishReason: TurnResult['finishReason']
}

// ─── 默认配置 ──────────────────────────────────────────────────────

const DEFAULT_CONFIG: TurnLoopConfig = {
  maxTurns: 10,
  timeoutMs: 120_000, // 2 分钟
  tools: [],
  maxTokens: 4096,
}

// ─── 工具执行器类型 ────────────────────────────────────────────────

export type ToolExecutor = (
  toolName: string,
  input: Record<string, unknown>,
) => Promise<{ output: unknown; success: boolean; error?: string }>

/**
 * 默认的空工具执行器（不执行任何操作，返回模拟结果）
 * 用于测试和 analysis_only 模式
 */
export async function noopToolExecutor(
  toolName: string,
  input: Record<string, unknown>,
): Promise<{ output: unknown; success: boolean; error?: string }> {
  void input
  return {
    output: { message: `[${toolName}] Noop execution in analysis_only mode` },
    success: true,
  }
}

/**
 * 创建沙箱工具执行器（便捷函数）
 *
 * 在 sandbox_execution 模式下使用，对接 sandbox-tool-executor.ts
 *
 * @param agentId 执行 Agent 的 ID
 * @param cwd 工作目录（默认 process.cwd()）
 */
export function createSandboxToolExecutor(
  agentId: string,
  cwd?: string,
): ToolExecutor {
  return createSandboxExecutor(agentId, { cwd })
}

// ─── 核心循环 ──────────────────────────────────────────────────────

/**
 * 运行 Agent Turn Loop
 *
 * @param agentId Agent 标识
 * @param taskId 任务 ID
 * @param messages 初始对话消息
 * @param config 循环配置
 * @param toolExecutor 工具执行函数
 * @param systemPromptOverride 可选：覆盖默认的 system prompt
 */
export async function runTurnLoop(
  agentId: AgentId,
  taskId: string,
  messages: ChatMessage[],
  config: Partial<TurnLoopConfig> = {},
  toolExecutor: ToolExecutor = noopToolExecutor,
  systemPromptOverride?: string,
): Promise<TurnLoopResult> {
  const startTime = Date.now()
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  // Kelvin 不参与 Agent Turn Loop
  if (agentId === 'kelvin') {
    return {
      agentId,
      turns: [],
      finalContent: '',
      allToolCalls: [],
      blockedToolCalls: [],
      totalUsage: { inputTokens: 0, outputTokens: 0 },
      totalDurationMs: 0,
      success: false,
      finishReason: 'error',
    }
  }

  // 构建 system prompt
  const systemPrompt = systemPromptOverride ?? buildSystemPrompt(agentId)

  // 构建工具定义列表（根据运行时模式选择工具集）
  const toolDefs = buildToolDefinitions(agentId, mergedConfig.tools, mergedConfig.runtimeMode)

  // 对话历史（可变）
  const conversation: ChatMessage[] = [...messages]
  const turns: TurnResult[] = []
  const allToolCalls: TurnToolCall[] = []
  const blockedToolCalls: TurnToolCall[] = []
  const totalUsage = { inputTokens: 0, outputTokens: 0 }

  const deadline = startTime + mergedConfig.timeoutMs
  let turnIndex = 0
  let finished = false
  let finishReason: TurnResult['finishReason'] = 'stop'

  while (turnIndex < mergedConfig.maxTurns && Date.now() < deadline) {
    const turnStart = Date.now()

    try {
      const provider = getLLMProvider()
      const result = await provider.chat(conversation, systemPrompt, {
        tools: toolDefs.length > 0 ? toolDefs : undefined,
        maxTokens: mergedConfig.maxTokens,
      })

      // 累计 token 用量（LLMChatResult 暂无 usage 字段，用 0 占位）
      totalUsage.inputTokens += 0
      totalUsage.outputTokens += 0

      // LLM 调用后检查超时（调用本身可能耗时很长）
      if (Date.now() >= deadline) {
        turns.push({
          turnIndex,
          role: 'assistant',
          content: result.content || '',
          usage: { inputTokens: 0, outputTokens: 0 },
          finished: true,
          finishReason: 'timeout',
          durationMs: Date.now() - turnStart,
        })
        finished = true
        finishReason = 'timeout'
        break
      }

      if (result.toolUse) {
        // LLM 请求调用工具
        const toolCall: TurnToolCall = {
          name: result.toolUse.name,
          input: result.toolUse.input,
        }

        // 检查是否允许执行工具
        const allowExecution = mergedConfig.allowToolExecution !== false
        if (allowExecution) {
          // 执行工具
          try {
            const execResult = await toolExecutor(result.toolUse.name, result.toolUse.input)
            toolCall.output = execResult.output
            toolCall.success = execResult.success
            toolCall.error = execResult.error
          } catch (execError) {
            toolCall.success = false
            toolCall.error = execError instanceof Error ? execError.message : String(execError)
          }
          allToolCalls.push(toolCall)
        } else {
          // 拦截工具调用
          toolCall.success = false
          toolCall.error = `Tool execution blocked: ${toolCall.name}`
          blockedToolCalls.push(toolCall)
        }

        // 将 assistant 的 tool_use 消息加入对话
        conversation.push({
          role: 'assistant',
          content: result.content || '',
        })

        // 将 tool_result 消息加入对话
        const toolResultContent = toolCall.success
          ? JSON.stringify(toolCall.output)
          : `Error: ${toolCall.error}`

        conversation.push({
          role: 'user',
          content: `[Tool Result: ${toolCall.name}]\n${toolResultContent}`,
        })

        turns.push({
          turnIndex,
          role: 'assistant',
          content: result.content || '',
          toolCalls: [toolCall],
          usage: { inputTokens: 0, outputTokens: 0 },
          finished: false,
          finishReason: 'stop',
          durationMs: Date.now() - turnStart,
        })

        turnIndex++
      } else {
        // LLM 返回纯文本，循环结束
        turns.push({
          turnIndex,
          role: 'assistant',
          content: result.content,
          usage: { inputTokens: 0, outputTokens: 0 },
          finished: true,
          finishReason: 'stop',
          durationMs: Date.now() - turnStart,
        })

        finished = true
        finishReason = result.stopReason === 'max_tokens' ? 'max_turns' : 'stop'
        break
      }
    } catch (error) {
      // LLM 调用失败
      const errorMsg = error instanceof Error ? error.message : String(error)
      turns.push({
        turnIndex,
        role: 'assistant',
        content: '',
        usage: { inputTokens: 0, outputTokens: 0 },
        finished: true,
        finishReason: 'error',
        durationMs: Date.now() - turnStart,
      })

      finished = true
      finishReason = 'error'
      console.error(`[TurnLoop] LLM error on turn ${turnIndex}:`, errorMsg)
      break
    }
  }

  // 检查是否因达到上限而终止
  if (!finished) {
    if (turnIndex >= mergedConfig.maxTurns) {
      finishReason = 'max_turns'
    } else {
      finishReason = 'timeout'
    }
  }

  // 提取最终文本内容
  const lastAssistantTurn = [...turns]
    .reverse()
    .find((t) => t.role === 'assistant' && t.content)

  return {
    agentId,
    turns,
    finalContent: lastAssistantTurn?.content ?? '',
    allToolCalls,
    blockedToolCalls,
    totalUsage,
    totalDurationMs: Date.now() - startTime,
    success: finished && (finishReason === 'stop' || finishReason === 'max_turns'),
    finishReason,
  }
}

// ─── 辅助函数 ──────────────────────────────────────────────────────

/**
 * 为指定 Agent 构建 System Prompt
 */
function buildSystemPrompt(agentId: Exclude<AgentId, 'kelvin'>): string {
  const agent = getAgentById(agentId)
  if (!agent) {
    return `You are ${agentId}, a specialist agent of CoWorker. Analyze the task and produce structured output.`
  }

  return buildAgentSystemPrompt(
    agentId,
    agent.name,
    agent.title,
    agent.description,
    agent.responsibilities,
    agent.skillPromptNames,
  )
}

/**
 * 构建工具定义列表（转为 LLMToolDefinition 格式）
 *
 * 根据运行时模式选择工具集：
 * - analysis_only：仅核心工具（noop、read_simulated 等）
 * - sandbox_execution：核心工具 + 沙箱命令工具
 *
 * 优先使用 config.tools 指定的工具，否则使用 Agent 核心工具
 */
function buildToolDefinitions(
  agentId: Exclude<AgentId, 'kelvin'>,
  toolIds: string[],
  runtimeMode: AgentRuntimeMode = 'analysis_only',
): LLMToolDefinition[] {
  // 如果指定了工具 ID，按 ID 过滤
  if (toolIds.length > 0) {
    return toolIds
      .filter((id) => isToolAllowedForAgent(id, agentId))
      .map((id) => ({
        name: id,
        description: `Tool: ${id}`,
        input_schema: { type: 'object', properties: {} },
      }))
  }

  // 基础工具：Agent 核心工具
  const coreTools = getCoreToolsForAgent(agentId)
  const baseToolDefs: LLMToolDefinition[] = coreTools.map((tool) => ({
    name: tool.id,
    description: tool.description,
    input_schema: tool.inputSchema as Record<string, unknown>,
  }))

  // sandbox_execution 模式下追加沙箱命令工具
  if (runtimeMode === 'sandbox_execution') {
    return [...baseToolDefs, ...SANDBOX_TOOL_DEFINITIONS]
  }

  return baseToolDefs
}
