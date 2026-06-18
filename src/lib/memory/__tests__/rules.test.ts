import { describe, expect, it } from 'vitest'
import type { AgentResult } from '@/lib/agent-runtime/types'
import { emptySideEffects } from '@/lib/harmony/types'
import { mapAgentResultToMemoryCandidates, selectContextItems } from '../rules'
import type { KnowledgeItem, MemoryEntry } from '../types'

const now = new Date().toISOString()

function memory(overrides: Partial<MemoryEntry>): MemoryEntry {
  return {
    id: 'mem-1',
    status: 'approved',
    title: 'Approved memory',
    content: 'Use local deterministic context only.',
    kind: 'technical_context',
    scope: 'task',
    taskId: 'task-1',
    sourceType: 'human_input',
    confidence: 0.9,
    tags: ['sprint5'],
    proposedBy: 'human',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function knowledge(overrides: Partial<KnowledgeItem>): KnowledgeItem {
  return {
    id: 'know-1',
    status: 'approved',
    title: 'Approved knowledge',
    content: 'Sprint 5 does not use RAG.',
    kind: 'safety_policy',
    scope: 'global',
    sourceType: 'manual',
    tags: ['sprint5'],
    version: 1,
    createdBy: 'human',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('Sprint 5 context and memory rules', () => {
  it('selects only approved deterministic context', () => {
    const result = selectContextItems({
      task: {
        id: 'task-1',
        title: 'Task',
        description: 'Analyze task',
      },
      agentId: 'jobs',
      memories: [
        memory({ id: 'approved' }),
        memory({ id: 'candidate', status: 'candidate' }),
        memory({ id: 'wrong-agent', agentId: 'linus' }),
      ],
      knowledgeItems: [
        knowledge({ id: 'approved-k' }),
        knowledge({ id: 'draft-k', status: 'draft' }),
      ],
    })

    expect(result.items.some((item) => item.sourceId === 'approved')).toBe(true)
    expect(result.items.some((item) => item.sourceId === 'candidate')).toBe(false)
    expect(result.items.some((item) => item.sourceId === 'draft-k')).toBe(false)
    expect(result.excludedItems.length).toBeGreaterThan(0)
  })

  it('maps AgentResult to MemoryEntry candidates only', () => {
    const agentResult: AgentResult = {
      status: 'completed',
      confidence: 0.8,
      summary: 'Analysis only.',
      findings: ['Keep memory local and reviewed.'],
      proposedChanges: [],
      next: { recommendedAction: 'show_result', reason: 'Done.' },
      sideEffects: emptySideEffects,
      needsHumanConfirmation: false,
      safetyNotes: ['Sprint 4 only produced structured analysis.'],
    }

    const candidates = mapAgentResultToMemoryCandidates({
      agentResult,
      taskId: 'task-1',
      agentRunId: 'run-1',
      agentId: 'jobs',
    })

    expect(candidates).toHaveLength(1)
    expect(candidates[0].status).toBe('candidate')
    expect(candidates[0].proposedBy).toBe('agent')
  })

  it('rejects memory candidates from side-effectful AgentResult', () => {
    const agentResult: AgentResult = {
      status: 'completed',
      confidence: 0.8,
      summary: 'Analysis only.',
      findings: ['Finding'],
      proposedChanges: [],
      next: { recommendedAction: 'show_result', reason: 'Done.' },
      sideEffects: { ...emptySideEffects, filesChanged: ['x.ts'] },
      needsHumanConfirmation: false,
      safetyNotes: ['Sprint 4 only produced structured analysis.'],
    }

    expect(() =>
      mapAgentResultToMemoryCandidates({
        agentResult,
        taskId: 'task-1',
        agentRunId: 'run-1',
        agentId: 'jobs',
      })
    ).toThrow('AgentResult sideEffects must be empty.')
  })
})
