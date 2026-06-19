/**
 * Agent 任务执行器
 *
 * 让单个 Agent 使用 Skill Prompt + Claude 执行具体任务。
 * 支持自动注入相关 Evidence 作为分析上下文。
 * 供 Task Scheduler 调用。
 */

import { getLLMProvider } from '@/lib/llm'
import type { LLMToolDefinition } from '@/lib/llm/types'
import type { AgentId, Deliverable } from './types'
import { getAgentById } from './registry'
import { buildAgentSystemPrompt } from './prompts/skills'
import { findRelevantEvidence } from '@/lib/evidence/repository'
import { executeToolCall } from '@/lib/tools/executor'
import { prisma } from '@/lib/prisma'
import type { HarmonyTask } from '@/lib/harmony/types'
import { produceDeterministicAgentResult } from '@/lib/agent-runtime/producer'

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
}

export interface BlockedToolRequest {
  toolName: string
  input: unknown
  reason: string
}

export interface AgentTaskExecutionOptions {
  allowDirectToolExecution?: boolean
}

const produceAnalysisTool: LLMToolDefinition = {
  name: 'produce_analysis',
  description: 'Produce a structured agent analysis result.',
  input_schema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['completed', 'blocked', 'needs_human_confirmation', 'failed'],
      },
      confidence: { type: 'number' },
      summary: { type: 'string' },
      findings: { type: 'array' },
      nextRecommendedAction: {
        type: 'string',
        enum: ['show_result', 'ask_human_confirmation', 'request_more_context', 'stop'],
      },
      nextReason: { type: 'string' },
    },
    required: ['status', 'confidence', 'summary', 'findings', 'nextRecommendedAction', 'nextReason'],
  },
}

/** Sprint 19: 调用工具 */
const useToolTool: LLMToolDefinition = {
  name: 'use_tool',
  description: 'Call a tool to perform an action. Available tools: execute_command (run shell command), write_file (save file), read_file (read file). Use this when you need to interact with the system.',
  input_schema: {
    type: 'object',
    properties: {
      toolName: {
        type: 'string',
        enum: ['execute_command', 'write_file', 'read_file'],
        description: 'Name of the tool to call',
      },
      input: {
        type: 'object',
        description: 'Input parameters for the tool',
      },
    },
    required: ['toolName', 'input'],
  },
}

/** Sprint 16: 产出交付物工具 */
const produceDeliverableTool: LLMToolDefinition = {
  name: 'produce_deliverable',
  description: 'Produce a deliverable (document, code, analysis, report, or plan). Use this to create actual output artifacts, not just analysis.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'One-line summary of what was produced' },
      confidence: { type: 'number', description: 'Confidence in the deliverable quality (0.0-1.0)' },
      deliverables: {
        type: 'array',
        description: 'List of deliverables produced',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['document', 'code', 'analysis', 'report', 'plan'],
              description: 'Type of deliverable',
            },
            title: { type: 'string', description: 'Title of the deliverable' },
            content: { type: 'string', description: 'Full content in Markdown format' },
            format: {
              type: 'string',
              enum: ['markdown', 'json', 'code'],
              description: 'Content format',
            },
          },
          required: ['type', 'title', 'content', 'format'],
        },
      },
      nextRecommendedAction: {
        type: 'string',
        enum: ['show_result', 'request_review', 'ask_human_confirmation'],
        description: 'What should happen next',
      },
      nextReason: { type: 'string', description: 'Reason for the next action' },
    },
    required: ['summary', 'confidence', 'deliverables', 'nextRecommendedAction', 'nextReason'],
  },
}

const knownAgentIds: AgentId[] = ['kelvin', 'elon', 'jobs', 'linus', 'turing', 'bezos']

function isAgentId(value: string): value is AgentId {
  return knownAgentIds.includes(value as AgentId)
}

/**
 * 执行单个 Agent 任务
 *
 * @param agentId 目标 Agent ID
 * @param taskDescription 任务描述
 * @param previousResults 前置任务的结果（作为上下文）
 * @returns 结构化执行结果
 */
export async function executeAgentTask(
  agentId: string,
  taskDescription: string,
  previousResults?: SubTaskResult[],
  options: AgentTaskExecutionOptions = {}
): Promise<SubTaskResult> {
  const startTime = Date.now()
  const allowDirectToolExecution = options.allowDirectToolExecution ?? true
  if (!isAgentId(agentId)) {
    return {
      agentId,
      agentName: agentId,
      title: taskDescription.slice(0, 50),
      status: 'failed',
      confidence: 0,
      summary: `Unknown agent: ${agentId}`,
      findings: [],
      deliverables: [],
      durationMs: Date.now() - startTime,
      error: `Agent "${agentId}" not found in registry.`,
    }
  }

  const typedAgentId = agentId
  const agent = getAgentById(typedAgentId)

  if (!agent) {
    return {
      agentId,
      agentName: agentId,
      title: taskDescription.slice(0, 50),
      status: 'failed',
      confidence: 0,
      summary: `Unknown agent: ${agentId}`,
      findings: [],
      deliverables: [],
      durationMs: Date.now() - startTime,
      error: `Agent "${agentId}" not found in registry.`,
    }
  }

  // 构建 System Prompt（含 Skill）
  const skillNames = agent.skillPromptNames ?? []
  const systemPrompt = buildAgentSystemPrompt(
    typedAgentId,
    agent.name,
    agent.title,
    agent.description,
    agent.responsibilities,
    skillNames.length > 0 ? skillNames : undefined
  )

  // 构建 User Message
  const userParts: string[] = [
    `## Task`,
    taskDescription,
  ]

  // 自动注入相关 Evidence
  try {
    const evidenceMatches = await findRelevantEvidence(typedAgentId, 'analysis', taskDescription, 3)
    if (evidenceMatches.length > 0) {
      userParts.push('', '## Related Evidence (read-only context)')
      for (const match of evidenceMatches) {
        userParts.push(`\n### ${match.evidence.title} (relevance: ${(match.relevanceScore * 100).toFixed(0)}%)`)
        userParts.push(`Source: ${match.evidence.source}${match.evidence.sourceId ? ` #${match.evidence.sourceId}` : ''}`)
        userParts.push(`Match: ${match.matchReason}`)
        // 截取前 500 字符避免上下文过长
        const contentPreview = match.evidence.content.slice(0, 500)
        userParts.push(`\`\`\`\n${contentPreview}${match.evidence.content.length > 500 ? '\n...' : ''}\n\`\`\``)
      }
    }
  } catch {
    // Evidence 查询失败不影响 Agent 执行
  }

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

  // Sprint 18: 自动检索历史记忆注入上下文
  try {
    const memories = await prisma.memoryEntry.findMany({
      where: { agentId: typedAgentId, status: 'approved' },
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

  if (allowDirectToolExecution) {
    userParts.push('', 'You can use tools to interact with the system (execute commands, write files, read files). After using tools, produce your output using the produce_deliverable tool.')
  } else {
    userParts.push('', 'Direct tool execution is disabled in this ChatHub agent run. If an external action is needed, describe the requested action as an approval-required proposal instead of calling a tool.')
  }

  const userMessage = userParts.join('\n')

  try {
    const provider = getLLMProvider()

    // Sprint 19: Agent 循环（支持工具调用）
    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      { role: 'user', content: userMessage },
    ]
    const allTools = allowDirectToolExecution
      ? [useToolTool, produceDeliverableTool, produceAnalysisTool]
      : [produceDeliverableTool, produceAnalysisTool]
    let toolCallCount = 0
    const maxToolCalls = 3

    // 初始调用
    let result = await provider.chat(messages, systemPrompt, {
      tools: allTools,
      maxTokens: 8192,
    })

    // 工具调用循环
    if (!allowDirectToolExecution && result.toolUse?.name === 'use_tool') {
      return createBlockedToolRequestResult({
        agentId,
        agentName: agent.name,
        taskDescription,
        toolUseInput: result.toolUse.input as Record<string, unknown>,
        durationMs: Date.now() - startTime,
      })
    }

    while (result.toolUse && result.toolUse.name === 'use_tool' && toolCallCount < maxToolCalls) {
      toolCallCount++
      const toolInput = result.toolUse.input as Record<string, unknown>
      const toolName = String(toolInput.toolName ?? '')
      const toolParams = (toolInput.input as Record<string, unknown>) ?? {}

      // 执行工具
      const toolResult = await executeToolCall(toolName, toolParams)

      // 将工具结果反馈给 Agent
      messages.push({ role: 'assistant', content: JSON.stringify(result.toolUse) })
      messages.push({
        role: 'user',
        content: `Tool execution result:\n- Tool: ${toolName}\n- Success: ${toolResult.success}\n- Output: ${toolResult.output.slice(0, 2000)}${toolResult.error ? `\n- Error: ${toolResult.error}` : ''}\n- Duration: ${toolResult.durationMs}ms\n\nNow continue your work. You can call another tool or produce your deliverables.`,
      })

      result = await provider.chat(messages, systemPrompt, {
        tools: allTools,
        maxTokens: 8192,
      })
    }

    if (result.toolUse && result.toolUse.name === 'produce_deliverable') {
      const input = result.toolUse.input
      const deliverables: Deliverable[] = Array.isArray(input.deliverables)
        ? input.deliverables.map((d: Record<string, unknown>) => ({
            type: (d.type as Deliverable['type']) ?? 'analysis',
            title: (d.title as string) ?? 'Untitled',
            content: (d.content as string) ?? '',
            format: (d.format as Deliverable['format']) ?? 'markdown',
          }))
        : []

      const confidence = typeof input.confidence === 'number' ? input.confidence : 0.8
      const summary = (input.summary as string) ?? 'Deliverables produced.'

      // Sprint 18: 自动写入 Memory
      console.log(`[Sprint18] produce_deliverable called, deliverables=${deliverables.length}`)
      if (deliverables.length > 0) {
        console.log(`[Sprint18] Writing memory for agent=${typedAgentId}, deliverables=${deliverables.length}`)
        try {
          const memoryContent = [
            summary,
            '',
            'Deliverables:',
            ...deliverables.map(d => `- [${d.type}] ${d.title}`),
          ].join('\n')

          const mem = await prisma.memoryEntry.create({
            data: {
              title: taskDescription.slice(0, 100),
              content: memoryContent,
              kind: 'agent_finding',
              scope: 'project',
              agentId: typedAgentId,
              status: 'approved',
              confidence,
              sourceType: 'agent_run',
              proposedBy: 'system',
              tagsJson: JSON.stringify([typedAgentId, ...deliverables.map(d => d.type)]),
            },
          })
          console.log(`[Sprint18] Memory written: ${mem.id}`)
        } catch (err) {
          console.error('[Sprint18] Failed to write memory:', err)
        }
      }

      return {
        agentId,
        agentName: agent.name,
        title: taskDescription.slice(0, 80),
        status: 'completed',
        confidence,
        summary,
        findings: [],
        deliverables,
        durationMs: Date.now() - startTime,
      }
    }

    if (result.toolUse && result.toolUse.name === 'produce_analysis') {
      const input = result.toolUse.input
      return {
        agentId,
        agentName: agent.name,
        title: taskDescription.slice(0, 80),
        status: 'completed',
        confidence: typeof input.confidence === 'number' ? input.confidence : 0.75,
        summary: (input.summary as string) ?? 'Analysis completed.',
        findings: Array.isArray(input.findings) ? input.findings.map(String) : [],
        deliverables: [],
        durationMs: Date.now() - startTime,
      }
    }

    // No tool use — return text-based result as a deliverable
    return {
      agentId,
      agentName: agent.name,
      title: taskDescription.slice(0, 80),
      status: 'completed',
      confidence: 0.6,
      summary: result.content?.slice(0, 200) || 'Agent produced a text response.',
      findings: [],
      deliverables: [{
        type: 'analysis',
        title: taskDescription.slice(0, 50),
        content: result.content || 'No content produced.',
        format: 'markdown',
      }],
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    // On LLM error, fall back to deterministic producer
    const task: HarmonyTask = {
      id: `subtask-${Date.now()}`,
      title: taskDescription.slice(0, 80),
      description: taskDescription,
      type: 'coordination',
      targetAgentId: typedAgentId,
      confidence: 0.7,
      reason: 'Multi-agent decomposition sub-task',
      status: 'queued',
      routeDecisionType: 'delegate_to_agent' as const,
      routeStatus: 'ready' as const,
      matchedSignals: [],
      routeDecisionSnapshot: {
        status: 'ready',
        decisionType: 'delegate_to_agent',
        targetAgentId: typedAgentId,
        confidence: 0.7,
        reason: 'Multi-agent decomposition sub-task',
        matchedSignals: [],
        requiresHumanConfirmation: false,
        next: {
          recommendedAction: 'show_route_suggestion',
          reason: 'Multi-agent decomposition sub-task',
        },
        sideEffects: {
          filesChanged: [],
          branchesCreated: [],
          prsCreated: [],
          issuesUpdated: [],
        },
      },
      requiresHumanConfirmation: false,
      sideEffects: {
        filesChanged: [],
        branchesCreated: [],
        prsCreated: [],
        issuesUpdated: [],
      },
      createdBy: 'system',
      conversationId: undefined,
      sourceMessageId: undefined,
      sourceMessageText: taskDescription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const fallbackResult = produceDeterministicAgentResult(task)
    return {
      agentId: typedAgentId,
      agentName: agent.name,
      title: taskDescription.slice(0, 80),
      status: 'completed',
      confidence: fallbackResult.confidence,
      summary: fallbackResult.summary,
      findings: fallbackResult.findings,
      deliverables: [],
      durationMs: Date.now() - startTime,
      error: `LLM call failed: ${error instanceof Error ? error.message : 'unknown'}. Used deterministic fallback.`,
    }
  }
}

function createBlockedToolRequestResult(input: {
  agentId: string
  agentName: string
  taskDescription: string
  toolUseInput: Record<string, unknown>
  durationMs: number
}): SubTaskResult {
  const toolName = String(input.toolUseInput.toolName ?? 'unknown_tool')
  const toolInput = input.toolUseInput.input ?? null
  const reason = 'Direct tool execution is disabled for ChatHub agent runs. Route this action through ExecutionRuntime and Kelvin approval.'
  const proposedActionSummary = `Agent requested ${toolName}; convert to an approval-gated execution plan before running.`

  return {
    agentId: input.agentId,
    agentName: input.agentName,
    title: input.taskDescription.slice(0, 80),
    status: 'completed',
    confidence: 0.6,
    summary: 'Agent requested a tool action that was withheld for Kelvin approval.',
    findings: [proposedActionSummary],
    deliverables: [],
    durationMs: input.durationMs,
    blockedToolRequests: [
      {
        toolName,
        input: toolInput,
        reason,
      },
    ],
    requiresApproval: true,
    proposedActionSummary,
  }
}
