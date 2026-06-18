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

// Must import after mock
const { routeMessageLLM } = await import('../llm-router')

describe('LLM CEO Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes product work to Jobs via LLM', async () => {
    mockChat.mockResolvedValueOnce({
      content: '',
      toolUse: {
        name: 'route_to_agent',
        input: {
          decisionType: 'delegate_to_agent',
          targetAgentId: 'jobs',
          confidence: 0.92,
          reason: 'User wants to write a PRD for a feature.',
          matchedSignals: ['prd', 'product'],
          suggestedTaskTitle: 'Shape product requirements',
          requiresHumanConfirmation: false,
        },
      },
      stopReason: 'tool_use',
    } satisfies LLMChatResult)

    const decision = await routeMessageLLM({
      message: 'Help me write a PRD for this feature',
    })

    expect(decision.status).toBe('ready')
    expect(decision.decisionType).toBe('delegate_to_agent')
    expect(decision.targetAgentId).toBe('jobs')
    expect(decision.confidence).toBe(0.92)
    expect(mockChat).toHaveBeenCalledOnce()
  })

  it('routes engineering work to Linus via LLM', async () => {
    mockChat.mockResolvedValueOnce({
      content: '',
      toolUse: {
        name: 'route_to_agent',
        input: {
          decisionType: 'delegate_to_agent',
          targetAgentId: 'linus',
          confidence: 0.88,
          reason: 'User asks about architecture and API design.',
          matchedSignals: ['architecture', 'api'],
          requiresHumanConfirmation: false,
        },
      },
      stopReason: 'tool_use',
    } satisfies LLMChatResult)

    const decision = await routeMessageLLM({
      message: 'Design the database and API architecture',
    })

    expect(decision.targetAgentId).toBe('linus')
    expect(decision.confidence).toBe(0.88)
  })

  it('blocks high-risk actions via LLM', async () => {
    mockChat.mockResolvedValueOnce({
      content: '',
      toolUse: {
        name: 'route_to_agent',
        input: {
          decisionType: 'needs_human_confirmation',
          targetAgentId: 'kelvin',
          confidence: 0.95,
          reason: 'Destructive action requires human approval.',
          matchedSignals: ['delete'],
          requiresHumanConfirmation: true,
        },
      },
      stopReason: 'tool_use',
    } satisfies LLMChatResult)

    const decision = await routeMessageLLM({
      message: 'Delete all files and deploy to production',
    })

    expect(decision.status).toBe('blocked')
    expect(decision.decisionType).toBe('needs_human_confirmation')
    expect(decision.targetAgentId).toBe('kelvin')
    expect(decision.requiresHumanConfirmation).toBe(true)
  })

  it('returns chat_only for simple questions via LLM', async () => {
    mockChat.mockResolvedValueOnce({
      content: '',
      toolUse: {
        name: 'route_to_agent',
        input: {
          decisionType: 'chat_only',
          confidence: 0.85,
          reason: 'Simple explanation request, no production work needed.',
          matchedSignals: [],
          requiresHumanConfirmation: false,
        },
      },
      stopReason: 'tool_use',
    } satisfies LLMChatResult)

    const decision = await routeMessageLLM({
      message: 'What is an agent router?',
    })

    expect(decision.decisionType).toBe('chat_only')
    expect(decision.next.recommendedAction).toBe('continue_chat')
  })

  it('falls back to keyword router on LLM error', async () => {
    mockChat.mockRejectedValueOnce(new Error('API timeout'))

    const decision = await routeMessageLLM({
      message: 'Help me write a PRD for this feature',
    })

    // Should fall back to keyword routing which routes PRD to jobs
    expect(decision.targetAgentId).toBe('jobs')
    expect(decision.decisionType).toBe('delegate_to_agent')
  })

  it('falls back to keyword router when no tool use returned', async () => {
    mockChat.mockResolvedValueOnce({
      content: 'I think this should go to jobs',
      stopReason: 'end_turn',
    } satisfies LLMChatResult)

    const decision = await routeMessageLLM({
      message: 'Help me write a PRD for this feature',
    })

    // Falls back to keyword routing
    expect(decision.targetAgentId).toBe('jobs')
  })

  it('returns empty side effects', async () => {
    mockChat.mockResolvedValueOnce({
      content: '',
      toolUse: {
        name: 'route_to_agent',
        input: {
          decisionType: 'delegate_to_agent',
          targetAgentId: 'jobs',
          confidence: 0.9,
          reason: 'Test',
          matchedSignals: [],
          requiresHumanConfirmation: false,
        },
      },
      stopReason: 'tool_use',
    } satisfies LLMChatResult)

    const decision = await routeMessageLLM({ message: 'Write a PRD' })

    expect(decision.sideEffects).toEqual({
      filesChanged: [],
      branchesCreated: [],
      prsCreated: [],
      issuesUpdated: [],
    })
  })

  it('clamps confidence to 0-1 range', async () => {
    mockChat.mockResolvedValueOnce({
      content: '',
      toolUse: {
        name: 'route_to_agent',
        input: {
          decisionType: 'delegate_to_agent',
          targetAgentId: 'jobs',
          confidence: 1.5,
          reason: 'Test',
          matchedSignals: [],
          requiresHumanConfirmation: false,
        },
      },
      stopReason: 'tool_use',
    } satisfies LLMChatResult)

    const decision = await routeMessageLLM({ message: 'Write a PRD' })
    expect(decision.confidence).toBe(1)
  })
})
