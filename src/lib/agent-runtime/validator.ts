import { hasSideEffects } from '@/lib/harmony/types'
import type { AgentResult } from './types'

const executedClaimPatterns = [
  /files?\s+(were\s+)?(changed|edited|written|deleted)/i,
  /commands?\s+(were\s+)?run/i,
  /branch\s+(was\s+)?created/i,
  /pr\s+(was\s+)?created/i,
  /deployed/i,
  /memory\s+(was\s+)?written/i,
  /external\s+api\s+(was\s+)?called/i,
  /a2a\s+message\s+(was\s+)?sent/i,
  /agent\s+(was\s+)?started/i,
]

export class InvalidAgentResultError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidAgentResultError'
  }
}

export function validateAgentResult(result: AgentResult): AgentResult {
  if (!result || typeof result !== 'object') {
    throw new InvalidAgentResultError('AgentResult must be an object.')
  }

  if (result.confidence < 0 || result.confidence > 1) {
    throw new InvalidAgentResultError('AgentResult confidence must be between 0 and 1.')
  }

  if (!result.summary || !Array.isArray(result.findings)) {
    throw new InvalidAgentResultError('AgentResult summary and findings are required.')
  }

  if (!Array.isArray(result.proposedChanges)) {
    throw new InvalidAgentResultError('AgentResult proposedChanges must be an array.')
  }

  if (hasSideEffects(result.sideEffects)) {
    throw new InvalidAgentResultError(
      'AgentResult sideEffects must be empty in Sprint 4.'
    )
  }

  const text = [
    result.summary,
    ...result.findings,
    ...result.proposedChanges.flatMap((change) => [
      change.title,
      change.description,
    ]),
    result.next.reason,
    ...result.safetyNotes,
  ].join('\n')

  if (executedClaimPatterns.some((pattern) => pattern.test(text))) {
    throw new InvalidAgentResultError(
      'AgentResult must not claim executed side effects.'
    )
  }

  if (
    !result.safetyNotes.some(
      (note) => note.includes('Sprint') || note.includes('analysis only') || note.includes('LLM call failed')
    )
  ) {
    throw new InvalidAgentResultError(
      'AgentResult safetyNotes must include a boundary note (Sprint, LLM analysis-only, or LLM failure).'
    )
  }

  const candidateText = [
    ...(result.memoryCandidates ?? []).flatMap((candidate) => [
      candidate.title,
      candidate.content,
    ]),
    ...(result.a2aDraftCandidates ?? []).flatMap((candidate) => [
      candidate.subject,
      candidate.body,
    ]),
    ...(result.toolCallCandidates ?? []).flatMap((candidate) => [
      candidate.toolName,
      candidate.intent,
      candidate.rationale,
      candidate.inputSummary,
      ...candidate.sideEffects,
    ]),
  ].join('\n')

  if (candidateText && executedClaimPatterns.some((pattern) => pattern.test(candidateText))) {
    throw new InvalidAgentResultError(
      'AgentResult candidates must not claim executed side effects.'
    )
  }

  for (const candidate of result.toolCallCandidates ?? []) {
    if (!candidate.toolName || !candidate.intent || !candidate.rationale) {
      throw new InvalidAgentResultError('ToolCall candidates require toolName, intent, and rationale.')
    }
    if (!Array.isArray(candidate.sideEffects)) {
      throw new InvalidAgentResultError('ToolCall candidate sideEffects must be an array.')
    }
    if (candidate.riskLevel === 'critical' && !candidate.requiresHumanConfirmation) {
      throw new InvalidAgentResultError('Critical ToolCall candidates require human confirmation.')
    }
  }

  return result
}
