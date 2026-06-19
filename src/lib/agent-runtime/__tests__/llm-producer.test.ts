import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { LLMChatResult } from '@/lib/llm/types'

// Mock the LLM provider
const mockChat = vi.fn()

vi.mock('@/lib/llm', () => ({
  getLLMProvider: () => ({
    name: 'mock',
    chat: mockChat,
    streamChat: vi.fn(),
  }),
}))

// Force analysis_only mode for tests to avoid turn-loop multi-call complexity
vi.mock('../types', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../types')>()
  return {
    ...mod,
    agentRuntimeConfig: {
      ...mod.agentRuntimeConfig,
      mode: 'analysis_only' as const,
    },
  }
})

// Must import after mock
const { produceLLMAgentResult } = await import('../llm-producer')

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    sourceMessageText: 'Test task',
    title: 'Test Task',
    description: 'A test task for the agent.',
    type: 'product' as const,
    status: 'queued' as const,
    routeDecisionType: 'delegate_to_agent' as const,
    routeStatus: 'ready' as const,
    targetAgentId: 'jobs' as const,
    confidence: 0.8,
    reason: 'Test routing reason',
    matchedSignals: ['test'],
    routeDecisionSnapshot: {} as never,
    requiresHumanConfirmation: false,
    sideEffects: { filesChanged: [], branchesCreated: [], prsCreated: [], issuesUpdated: [] },
    createdBy: 'user' as const,
    createdAt: '2026-06-16T00:00:00Z',
    updatedAt: '2026-06-16T00:00:00Z',
    ...overrides,
  }
}

describe('LLM Agent Result Producer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('produces AgentResult from LLM tool use for Jobs agent', async () => {
    mockChat.mockResolvedValueOnce({
      content: '',
      toolUse: {
        name: 'produce_analysis',
        input: {
          status: 'completed',
          confidence: 0.88,
          summary: 'Analyzed product requirements for user authentication.',
          findings: ['Core user path identified', 'Edge cases need clarification'],
          proposedChanges: [
            {
              type: 'requirement',
              title: 'Auth Flow Requirements',
              description: 'Define login, signup, and password reset flows.',
              riskLevel: 'low',
            },
          ],
          nextRecommendedAction: 'show_result',
          nextReason: 'Product analysis complete. Ready for review.',
        },
      },
      stopReason: 'tool_use',
    } satisfies LLMChatResult)

    const result = await produceLLMAgentResult(makeTask())

    expect(result.status).toBe('completed')
    expect(result.confidence).toBe(0.88)
    expect(result.summary).toContain('product requirements')
    expect(result.findings).toHaveLength(2)
    expect(result.proposedChanges).toHaveLength(1)
    expect(result.proposedChanges[0].type).toBe('requirement')
    expect(result.needsHumanConfirmation).toBe(false)
    expect(result.safetyNotes.some((n) => n.includes('analysis only'))).toBe(true)
  })

  it('returns failed status on LLM error instead of disguising as completed', async () => {
    mockChat.mockRejectedValueOnce(new Error('API error'))

    const result = await produceLLMAgentResult(makeTask())

    // Should NOT fall back to deterministic — must surface the real error
    expect(result.status).toBe('failed')
    expect(result.confidence).toBe(0)
    expect(result.summary).toContain('LLM call failed')
    expect(result.needsHumanConfirmation).toBe(true)
  })

  it('returns failed status when LLM returns no tool use', async () => {
    mockChat.mockResolvedValueOnce({
      content: 'Here is my analysis...',
      stopReason: 'end_turn',
    } satisfies LLMChatResult)

    const result = await produceLLMAgentResult(makeTask())

    // Should NOT fall back to deterministic — must surface the real error
    expect(result.status).toBe('failed')
    expect(result.confidence).toBe(0)
    expect(result.summary).toContain('did not produce a structured analysis')
    expect(result.needsHumanConfirmation).toBe(true)
  })

  it('returns blocked status when LLM sets needs_human_confirmation', async () => {
    mockChat.mockResolvedValueOnce({
      content: '',
      toolUse: {
        name: 'produce_analysis',
        input: {
          status: 'needs_human_confirmation',
          confidence: 0.75,
          summary: 'High-risk change requires Kelvin approval.',
          findings: ['Potential data loss risk'],
          proposedChanges: [],
          nextRecommendedAction: 'ask_human_confirmation',
          nextReason: 'Requires human review before proceeding.',
        },
      },
      stopReason: 'tool_use',
    } satisfies LLMChatResult)

    const result = await produceLLMAgentResult(makeTask({ targetAgentId: 'linus' }))

    expect(result.status).toBe('needs_human_confirmation')
    expect(result.needsHumanConfirmation).toBe(true)
  })

  it('returns deterministic result for Kelvin agent', async () => {
    const result = await produceLLMAgentResult(makeTask({ targetAgentId: 'kelvin' }))

    // Should NOT call LLM for Kelvin
    expect(mockChat).not.toHaveBeenCalled()
    expect(result.status).toBe('blocked')
    expect(result.needsHumanConfirmation).toBe(true)
  })

  it('clamps confidence to 0-1 range', async () => {
    mockChat.mockResolvedValueOnce({
      content: '',
      toolUse: {
        name: 'produce_analysis',
        input: {
          status: 'completed',
          confidence: 2.0,
          summary: 'Test',
          findings: [],
          proposedChanges: [],
          nextRecommendedAction: 'show_result',
          nextReason: 'Test',
        },
      },
      stopReason: 'tool_use',
    } satisfies LLMChatResult)

    const result = await produceLLMAgentResult(makeTask())
    expect(result.confidence).toBe(1)
  })

  it('always has empty sideEffects', async () => {
    mockChat.mockResolvedValueOnce({
      content: '',
      toolUse: {
        name: 'produce_analysis',
        input: {
          status: 'completed',
          confidence: 0.8,
          summary: 'Test',
          findings: [],
          proposedChanges: [],
          nextRecommendedAction: 'show_result',
          nextReason: 'Test',
        },
      },
      stopReason: 'tool_use',
    } satisfies LLMChatResult)

    const result = await produceLLMAgentResult(makeTask())
    expect(result.sideEffects).toEqual({
      filesChanged: [],
      branchesCreated: [],
      prsCreated: [],
      issuesUpdated: [],
    })
  })
})
