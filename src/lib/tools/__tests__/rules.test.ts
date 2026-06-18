import { describe, expect, it } from 'vitest'
import type { AgentResult } from '@/lib/agent-runtime/types'
import { emptySideEffects } from '@/lib/harmony/types'
import { mapAgentResultToToolCallDrafts } from '../rules'

function result(overrides: Partial<AgentResult> = {}): AgentResult {
  return {
    status: 'completed',
    confidence: 0.8,
    summary: 'Analysis only.',
    findings: ['Finding'],
    proposedChanges: [
      {
        type: 'design',
        title: 'Outline implementation',
        description: 'Create a local proposal only.',
        riskLevel: 'low',
      },
    ],
    next: { recommendedAction: 'show_result', reason: 'Done.' },
    sideEffects: emptySideEffects,
    needsHumanConfirmation: false,
    safetyNotes: ['Sprint 4 only produced structured analysis.'],
    ...overrides,
  }
}

describe('AgentResult to ToolCall proposal mapping', () => {
  it('creates local proposal drafts only', () => {
    const calls = mapAgentResultToToolCallDrafts({
      agentResult: result(),
      agentRunId: 'run-1',
      taskId: 'task-1',
      agentId: 'linus',
      idempotencyKey: 'key',
    })

    expect(calls).toHaveLength(1)
    expect(calls[0].status).toBe('proposed')
    expect(calls[0].toolName).toBe('noop.note')
    expect(calls[0].sourceSnapshot).toBeTruthy()
    expect(calls[0].policyInputSnapshot).toBeTruthy()
  })

  it('rejects side-effectful AgentResult', () => {
    expect(() =>
      mapAgentResultToToolCallDrafts({
        agentResult: result({ sideEffects: { ...emptySideEffects, filesChanged: ['x.ts'] } }),
        agentRunId: 'run-1',
        taskId: 'task-1',
        agentId: 'linus',
      })
    ).toThrow('AgentResult sideEffects must be empty.')
  })
})
