/**
 * LLM-driven CEO Router
 *
 * Uses Claude to understand user intent and route to the appropriate Agent.
 * Supports single-agent routing and multi-agent task decomposition.
 * Falls back to keyword-based routing on LLM failure.
 */

import { getLLMProvider } from '@/lib/llm'
import type { LLMToolDefinition } from '@/lib/llm/types'
import { getAgents } from './registry'
import { routeMessage } from './router'
import type { AgentId, RouteDecision, RouteMessageInput } from './types'

const CEO_SYSTEM_PROMPT = `You are the CEO Agent (Elon) of CoWorker, an AI production system.

Your role: Understand the user's intent and either route to a single specialist OR decompose into sub-tasks for multiple specialists.

## Your Team

${getAgents()
  .filter((a) => a.id !== 'kelvin')
  .map(
    (a) => `- **${a.name}** (${a.id}): ${a.title}. ${a.description}
  Responsibilities: ${a.responsibilities.join(', ')}`
  )
  .join('\n')}

## Decision Logic

**Single agent** — use route_to_agent when the task is clearly within ONE agent's domain:
- Product requirements/PRD/UX → jobs
- Architecture/code/API/database → linus
- Testing/eval/review/diagnosis → turing
- Customer feedback/market/business → bezos
- Simple questions/explanations → chat_only
- High-risk actions (delete, deploy, publish) → needs_human_confirmation

**Multi-agent decomposition** — use decompose_task when the task requires MULTIPLE specialists:
- "分析这个功能的 PRD 和技术方案" → jobs + linus
- "帮我写代码并测试" → linus + turing
- "分析竞品并整理成报告" → bezos + jobs
- Any task that clearly needs 2+ different roles

## Output

Use route_to_agent for single-agent routing, or decompose_task for multi-agent decomposition.`

/** 子任务定义 */
export interface SubTask {
  agentId: 'jobs' | 'linus' | 'turing' | 'bezos'
  title: string
  description: string
  dependsOn: number[]
}

/** 任务分解结果 */
export interface TaskDecomposition {
  reasoning: string
  subtasks: SubTask[]
}

const decomposeTool: LLMToolDefinition = {
  name: 'decompose_task',
  description: 'Decompose a complex task into sub-tasks for specialist agents. Use when the task requires multiple specialists.',
  input_schema: {
    type: 'object',
    properties: {
      reasoning: {
        type: 'string',
        description: 'Why this task needs decomposition and how you split it.',
      },
      subtasks: {
        type: 'array',
        description: 'List of sub-tasks, each assigned to a specialist agent.',
        items: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              enum: ['jobs', 'linus', 'turing', 'bezos'],
              description: 'The specialist agent for this sub-task.',
            },
            title: {
              type: 'string',
              description: 'Short title for the sub-task.',
            },
            description: {
              type: 'string',
              description: 'Detailed description of what this agent should do.',
            },
            dependsOn: {
              type: 'array',
              description: 'Indices of sub-tasks this one depends on (0-based). Empty if no dependencies.',
            },
          },
          required: ['agentId', 'title', 'description'],
        },
      },
    },
    required: ['reasoning', 'subtasks'],
  },
}

const routeTool: LLMToolDefinition = {
  name: 'route_to_agent',
  description: 'Route the user message to the appropriate agent or action.',
  input_schema: {
    type: 'object',
    properties: {
      decisionType: {
        type: 'string',
        enum: [
          'chat_only',
          'create_task',
          'delegate_to_agent',
          'needs_human_confirmation',
          'unsupported',
        ],
        description: 'The type of routing decision.',
      },
      targetAgentId: {
        type: 'string',
        enum: ['elon', 'jobs', 'linus', 'turing', 'bezos', 'kelvin'],
        description: 'The target agent ID (required for delegate_to_agent and needs_human_confirmation).',
      },
      confidence: {
        type: 'number',
        description: 'Confidence in the routing decision (0.0 to 1.0).',
      },
      reason: {
        type: 'string',
        description: 'Brief explanation of why this agent was chosen.',
      },
      matchedSignals: {
        type: 'array',
        description: 'Key signals that influenced the routing decision.',
      },
      suggestedTaskTitle: {
        type: 'string',
        description: 'Suggested title for the task if creating one.',
      },
      requiresHumanConfirmation: {
        type: 'boolean',
        description: 'Whether this requires Kelvin (human) approval.',
      },
      taskDecomposition: {
        type: 'array',
        description: 'For complex tasks, decomposed sub-tasks with agent assignments.',
      },
    },
    required: ['decisionType', 'confidence', 'reason'],
  },
}

function buildRouteDecisionFromToolUse(
  toolInput: Record<string, unknown>
): RouteDecision {
  const decisionType = (toolInput.decisionType as string) ?? 'chat_only'
  const targetAgentId = toolInput.targetAgentId as AgentId | undefined
  const confidence = typeof toolInput.confidence === 'number' ? toolInput.confidence : 0.7
  const reason = (toolInput.reason as string) ?? 'LLM routing decision'
  const matchedSignals = Array.isArray(toolInput.matchedSignals)
    ? toolInput.matchedSignals.map(String)
    : []
  const suggestedTaskTitle = toolInput.suggestedTaskTitle as string | undefined
  const requiresHumanConfirmation =
    decisionType === 'needs_human_confirmation' ||
    (typeof toolInput.requiresHumanConfirmation === 'boolean' &&
      toolInput.requiresHumanConfirmation)

  const status =
    decisionType === 'needs_human_confirmation'
      ? 'blocked'
      : decisionType === 'unsupported'
        ? 'unsupported'
        : 'ready'

  return {
    status: status as RouteDecision['status'],
    decisionType: decisionType as RouteDecision['decisionType'],
    targetAgentId,
    confidence: Math.max(0, Math.min(1, confidence)),
    reason,
    matchedSignals,
    suggestedTaskTitle,
    requiresHumanConfirmation,
    next: {
      recommendedAction: requiresHumanConfirmation
        ? 'ask_human_confirmation'
        : decisionType === 'unsupported'
          ? 'show_unsupported'
          : decisionType === 'chat_only'
            ? 'continue_chat'
            : 'show_route_suggestion',
      reason,
    },
    sideEffects: {
      filesChanged: [],
      branchesCreated: [],
      prsCreated: [],
      issuesUpdated: [],
    },
  }
}

function buildDecompositionFromToolUse(
  toolInput: Record<string, unknown>
): TaskDecomposition {
  const reasoning = (toolInput.reasoning as string) ?? 'Task requires multiple specialists.'
  const rawSubtasks = Array.isArray(toolInput.subtasks) ? toolInput.subtasks : []

  const subtasks: SubTask[] = rawSubtasks.map((st: Record<string, unknown>) => ({
    agentId: (st.agentId as SubTask['agentId']) ?? 'jobs',
    title: (st.title as string) ?? 'Untitled sub-task',
    description: (st.description as string) ?? '',
    dependsOn: Array.isArray(st.dependsOn)
      ? st.dependsOn.map((d: unknown) => Number(d))
      : [],
  }))

  return { reasoning, subtasks }
}

/**
 * LLM-driven message routing.
 * Uses Claude for intent understanding with Tool Use for structured output.
 * Supports both single-agent routing and multi-agent decomposition.
 * Falls back to keyword-based routing on any error.
 */
export async function routeMessageLLM(
  input: RouteMessageInput
): Promise<RouteDecision & { decomposition?: TaskDecomposition }> {
  // Quick guard: empty message
  if (!input.message.trim()) {
    return routeMessage(input)
  }

  try {
    const provider = getLLMProvider()
    const result = await provider.chat(
      [{ role: 'user', content: input.message }],
      CEO_SYSTEM_PROMPT,
      {
        tools: [routeTool, decomposeTool],
        maxTokens: 2048,
      }
    )

    if (result.toolUse) {
      if (result.toolUse.name === 'route_to_agent') {
        return buildRouteDecisionFromToolUse(result.toolUse.input)
      }
      if (result.toolUse.name === 'decompose_task') {
        const decomposition = buildDecompositionFromToolUse(result.toolUse.input)
        // Return a route decision with decomposition attached
        return {
          status: 'ready',
          decisionType: 'delegate_to_agent',
          targetAgentId: decomposition.subtasks[0]?.agentId as AgentId | undefined,
          confidence: 0.85,
          reason: decomposition.reasoning,
          matchedSignals: decomposition.subtasks.map((s) => s.agentId),
          requiresHumanConfirmation: false,
          next: {
            recommendedAction: 'show_route_suggestion',
            reason: decomposition.reasoning,
          },
          sideEffects: {
            filesChanged: [],
            branchesCreated: [],
            prsCreated: [],
            issuesUpdated: [],
          },
          decomposition,
        }
      }
    }

    // If no tool use, fall back to keyword routing
    return routeMessage(input)
  } catch {
    // On any LLM error, fall back to keyword-based routing
    return routeMessage(input)
  }
}
