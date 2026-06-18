import type { AgentResult } from '@/lib/agent-runtime/types'
import { hasSideEffects } from '@/lib/harmony/types'
import { findToolByIdOrName } from './registry'
import type { ToolCall, ToolCallCandidate } from './types'

export class ToolRuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ToolRuleError'
  }
}

export function mapAgentResultToToolCallDrafts(input: {
  agentResult: AgentResult
  agentRunId: string
  taskId: string
  agentId: ToolCall['proposedByAgentId']
  idempotencyKey?: string
}): Omit<ToolCall, 'id' | 'createdAt' | 'updatedAt'>[] {
  const result = input.agentResult
  if (!['completed', 'needs_human_confirmation'].includes(result.status)) {
    throw new ToolRuleError('AgentResult status cannot create ToolCall proposals.')
  }
  if (hasSideEffects(result.sideEffects)) {
    throw new ToolRuleError('AgentResult sideEffects must be empty.')
  }

  const candidates = result.toolCallCandidates?.length
    ? result.toolCallCandidates
    : defaultCandidatesFromResult(result)

  return candidates.map((candidate, index) => {
    const tool = findToolByIdOrName(candidate.toolName)
    return {
      taskId: input.taskId,
      agentRunId: input.agentRunId,
      agentResultId: input.agentRunId,
      source: 'agent_result',
      toolId: tool?.id ?? candidate.toolName,
      toolName: tool?.name ?? candidate.toolName,
      proposedByAgentId: input.agentId,
      intent: candidate.intent,
      rationale: candidate.rationale,
      input: candidate.input,
      inputSummary: candidate.inputSummary,
      status: 'proposed',
      riskLevel: candidate.riskLevel,
      sideEffects: candidate.sideEffects,
      sourceSnapshot: {
        status: result.status,
        confidence: result.confidence,
        summary: result.summary,
        next: result.next,
      },
      policyInputSnapshot: {
        toolName: candidate.toolName,
        normalizedInput: candidate.input,
      },
      idempotencyKey: input.idempotencyKey ? `${input.idempotencyKey}:${index}` : undefined,
      correlationId: `tool-${input.agentRunId}`,
    }
  })
}

function defaultCandidatesFromResult(result: AgentResult): ToolCallCandidate[] {
  if (result.proposedChanges.length === 0) return []
  return result.proposedChanges.slice(0, 3).map((change) => ({
    toolName: 'noop.note',
    intent: `Record proposal: ${change.title}`,
    rationale:
      'AgentResult proposed a future action. Sprint 6 records a local ToolCall proposal only.',
    input: { note: `${change.type}: ${change.description}` },
    inputSummary: change.description.slice(0, 240),
    riskLevel: change.riskLevel === 'high' ? 'medium' : change.riskLevel,
    requiresHumanConfirmation: change.riskLevel !== 'low',
    sideEffects: [],
  }))
}
