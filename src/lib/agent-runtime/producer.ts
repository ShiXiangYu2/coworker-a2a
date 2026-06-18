import type { AgentId } from '@/lib/agents/types'
import { getAgentById } from '@/lib/agents/registry'
import { buildAgentSystemPrompt, getSkillPromptsForAgent } from '@/lib/agents/prompts/skills'
import type { HarmonyTask } from '@/lib/harmony/types'
import { emptySideEffects } from '@/lib/harmony/types'
import { agentRuntimeSafetyNote, type AgentResult } from './types'

const roleTemplates: Record<Exclude<AgentId, 'kelvin'>, {
  type: AgentResult['proposedChanges'][number]['type']
  focus: string
  action: AgentResult['next']['recommendedAction']
}> = {
  elon: {
    type: 'coordination',
    focus: 'coordination plan, decomposition, and next agent routing',
    action: 'show_result',
  },
  jobs: {
    type: 'requirement',
    focus: 'requirements, product experience, and acceptance criteria',
    action: 'show_result',
  },
  linus: {
    type: 'design',
    focus: 'architecture, implementation boundaries, and engineering risk',
    action: 'show_result',
  },
  turing: {
    type: 'test',
    focus: 'test strategy, evals, and regression risk',
    action: 'show_result',
  },
  bezos: {
    type: 'customer_insight',
    focus: 'customer value, market signal, and business impact',
    action: 'show_result',
  },
}

/**
 * 为指定任务构建 Agent 的完整 System Prompt（含 Skill 行为规范）
 *
 * 当 Agent Runtime 升级为真实 LLM 执行时，此函数生成的 prompt 将作为
 * LLMProvider.chat() 的 systemPrompt 参数。
 */
export function buildAgentSystemPromptForTask(task: HarmonyTask): string | null {
  const agentId = task.targetAgentId
  if (!agentId || agentId === 'kelvin') return null

  const agent = getAgentById(agentId)
  if (!agent) return null

  const skills = getSkillPromptsForAgent(agentId)
  const skillNames = skills.map((s) => s.name)

  return buildAgentSystemPrompt(
    agentId,
    agent.name,
    agent.title,
    agent.description,
    agent.responsibilities,
    skillNames.length > 0 ? skillNames : agent.skillPromptNames
  )
}

export function produceDeterministicAgentResult(task: HarmonyTask): AgentResult {
  const agentId = task.targetAgentId

  if (!agentId || agentId === 'kelvin') {
    return {
      status: 'blocked',
      confidence: 0.2,
      summary: 'Agent analysis is blocked because no automated specialist agent is available.',
      findings: ['Kelvin is reserved for human confirmation and owner review by default.'],
      proposedChanges: [],
      next: {
        recommendedAction: 'ask_human_confirmation',
        reason: 'Human owner review is required before continuing.',
        suggestedNextAgentId: 'kelvin',
      },
      sideEffects: emptySideEffects,
      needsHumanConfirmation: true,
      safetyNotes: [agentRuntimeSafetyNote],
    }
  }

  const template = roleTemplates[agentId]
  const title = task.title || 'Harmony Task'

  return {
    status: 'completed',
    confidence: Math.max(0.6, Math.min(task.confidence || 0.8, 0.95)),
    summary: `${agentId} produced analysis for "${title}" focused on ${template.focus}.`,
    findings: [
      `Task type is ${task.type}.`,
      `Route reason: ${task.reason}`,
      `Sprint 4 analysis is advisory and does not perform implementation.`,
    ],
    proposedChanges: [
      {
        type: template.type,
        title: `Review ${title}`,
        description: `Prepare a ${template.focus} outline for human review before any future execution sprint.`,
        riskLevel: 'low',
      },
    ],
    toolCallCandidates: [
      {
        toolName: 'noop.note',
        intent: `Record local proposal for ${title}`,
        rationale:
          'Sprint 6 can record a ToolCall proposal for review without executing tools.',
        input: {
          note: `Prepare a ${template.focus} outline for human review.`,
        },
        inputSummary: `Local no-op proposal for ${agentId} analysis.`,
        riskLevel: 'low',
        requiresHumanConfirmation: false,
        sideEffects: [],
      },
    ],
    next: {
      recommendedAction: template.action,
      reason: 'Show the structured analysis result and keep task state assigned for review.',
    },
    sideEffects: emptySideEffects,
    needsHumanConfirmation: false,
    safetyNotes: [agentRuntimeSafetyNote],
  }
}
