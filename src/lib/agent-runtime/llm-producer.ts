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
import type { AgentResult } from './types'
import { produceDeterministicAgentResult } from './producer'

/**
 * 为指定 Agent 构建 System Prompt（使用 Skill Prompt）
 */
function getAgentSystemPrompt(agentId: Exclude<AgentId, 'kelvin'>): string {
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
    agent.skillPromptNames
  )
}

const LLM_SAFETY_NOTE =
  'LLM-driven Agent Runtime produces structured analysis only. No tools, commands, file edits, PRs, deploys, deletes, or memory writes executed.'

const produceAnalysisTool: LLMToolDefinition = {
  name: 'produce_analysis',
  description:
    'Produce a structured agent analysis result. All fields are required.',
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
 * LLM-driven Agent Result producer.
 * Uses Claude Sonnet with Tool Use for structured output.
 * Falls back to deterministic producer on any error.
 */
export async function produceLLMAgentResult(
  task: HarmonyTask,
  context?: unknown
): Promise<AgentResult> {
  void context
  const agentId = task.targetAgentId

  // Kelvin always requires human confirmation
  if (!agentId || agentId === 'kelvin') {
    return produceDeterministicAgentResult(task)
  }

  try {
    const provider = getLLMProvider()
    const systemPrompt = getAgentSystemPrompt(agentId)

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

    if (result.toolUse && result.toolUse.name === 'produce_analysis') {
      const agentResult = buildAgentResultFromToolUse(result.toolUse.input)
      // Always ensure safety note is present
      if (!agentResult.safetyNotes.some((n) => n.includes('analysis only'))) {
        agentResult.safetyNotes.push(LLM_SAFETY_NOTE)
      }
      return agentResult
    }

    // If no tool use, fall back to deterministic
    return produceDeterministicAgentResult(task)
  } catch {
    // On any LLM error, fall back to deterministic behavior
    return produceDeterministicAgentResult(task)
  }
}
