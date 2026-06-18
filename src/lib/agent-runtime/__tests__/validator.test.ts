import { describe, expect, it } from 'vitest'
import { emptySideEffects } from '@/lib/harmony/types'
import { validateAgentResult } from '../validator'
import { agentRuntimeSafetyNote, type AgentResult } from '../types'

function result(overrides: Partial<AgentResult> = {}): AgentResult {
  return {
    status: 'completed',
    confidence: 0.8,
    summary: 'Analysis only result.',
    findings: ['No side effects were performed.'],
    proposedChanges: [],
    next: {
      recommendedAction: 'show_result',
      reason: 'Show the result.',
    },
    sideEffects: emptySideEffects,
    needsHumanConfirmation: false,
    safetyNotes: [agentRuntimeSafetyNote],
    ...overrides,
  }
}

describe('AgentResult validator', () => {
  it('accepts valid analysis-only results', () => {
    expect(validateAgentResult(result()).status).toBe('completed')
  })

  it('rejects non-empty side effects', () => {
    expect(() =>
      validateAgentResult(
        result({
          sideEffects: {
            filesChanged: ['file.ts'],
            branchesCreated: [],
            prsCreated: [],
            issuesUpdated: [],
          },
        })
      )
    ).toThrow('sideEffects must be empty')
  })

  it('rejects executed side-effect claims', () => {
    expect(() =>
      validateAgentResult(result({ summary: 'Files were changed successfully.' }))
    ).toThrow('must not claim executed side effects')
  })
})
