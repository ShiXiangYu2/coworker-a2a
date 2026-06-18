import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetLLMProvider } from '../index'

// Mock @anthropic-ai/sdk
const mockStream = vi.fn()
const mockCreate = vi.fn()

// Create a mock class that can be instantiated with `new`
class MockAnthropic {
  messages = {
    stream: mockStream,
    create: mockCreate,
  }
  constructor(_opts?: unknown) {
    // constructor receives { apiKey }
  }
}

vi.mock('@anthropic-ai/sdk', () => ({
  default: MockAnthropic,
  AuthenticationError: class AuthenticationError extends Error {
    status = 401
    constructor(message: string) {
      super(message)
      this.name = 'AuthenticationError'
    }
  },
  RateLimitError: class RateLimitError extends Error {
    status = 429
    constructor(message: string) {
      super(message)
      this.name = 'RateLimitError'
    }
  },
  APIError: class APIError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
      this.name = 'APIError'
    }
  },
}))

describe('ClaudeLLMProvider', () => {
  beforeEach(() => {
    resetLLMProvider()
    process.env.LLM_PROVIDER = 'claude'
    process.env.ANTHROPIC_API_KEY = 'test-api-key'
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should throw if ANTHROPIC_API_KEY is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY
      delete process.env.CLAUDE_API_KEY
      const { ClaudeLLMProvider } = await import('../claude')
      expect(() => new ClaudeLLMProvider()).toThrow('CLAUDE_API_KEY is required')
    })

    it('should use default model and maxTokens', async () => {
      delete process.env.CLAUDE_MODEL
      delete process.env.CLAUDE_MAX_TOKENS
      const { ClaudeLLMProvider } = await import('../claude')
      const provider = new ClaudeLLMProvider()
      expect(provider.name).toBe('claude')
    })
  })

  describe('streamChat', () => {
    it('should yield start, delta, and done events', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } }
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' World' } }
        },
      }
      mockStream.mockReturnValue(mockAsyncIterator)

      const { ClaudeLLMProvider } = await import('../claude')
      const provider = new ClaudeLLMProvider()
      const gen = provider.streamChat(
        [{ role: 'user', content: 'hi' }],
        'You are helpful'
      )

      const events: Array<{ type: string; content?: string }> = []
      for await (const event of gen) {
        events.push(event)
      }

      expect(events[0]).toEqual({ type: 'start' })
      expect(events).toContainEqual({ type: 'delta', content: 'Hello' })
      expect(events).toContainEqual({ type: 'delta', content: ' World' })
      expect(events[events.length - 1]).toEqual({ type: 'done' })
    })

    it('should filter out system messages', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'ok' } }
        },
      }
      mockStream.mockReturnValue(mockAsyncIterator)

      const { ClaudeLLMProvider } = await import('../claude')
      const provider = new ClaudeLLMProvider()
      const gen = provider.streamChat(
        [
          { role: 'system', content: 'system msg' },
          { role: 'user', content: 'user msg' },
        ],
        'System prompt'
      )

      // Consume the generator
      for await (const _ of gen) {
        void _
      }

      // Verify stream was called with filtered messages
      expect(mockStream).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'user msg' }],
        })
      )
    })

    it('should yield error event on stream failure', async () => {
      mockStream.mockImplementation(() => {
        throw new Error('API rate limit')
      })

      const { ClaudeLLMProvider } = await import('../claude')
      const provider = new ClaudeLLMProvider()
      const gen = provider.streamChat(
        [{ role: 'user', content: 'hi' }],
        'You are helpful'
      )

      const events: Array<{ type: string; error?: string }> = []
      for await (const event of gen) {
        events.push(event)
      }

      expect(events).toContainEqual({ type: 'start' })
      expect(events).toContainEqual({ type: 'error', error: 'API rate limit' })
      expect(events).toContainEqual({ type: 'done' })
    })
  })

  describe('chat', () => {
    it('should return text content', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello from Claude' }],
        stop_reason: 'end_turn',
      })

      const { ClaudeLLMProvider } = await import('../claude')
      const provider = new ClaudeLLMProvider()
      const result = await provider.chat(
        [{ role: 'user', content: 'hi' }],
        'You are helpful'
      )

      expect(result.content).toBe('Hello from Claude')
      expect(result.stopReason).toBe('end_turn')
      expect(result.toolUse).toBeUndefined()
    })

    it('should return tool use when Claude calls a tool', async () => {
      mockCreate.mockResolvedValue({
        content: [
          { type: 'text', text: 'Let me route that.' },
          {
            type: 'tool_use',
            name: 'route_to_agent',
            input: { decisionType: 'delegate_to_agent', targetAgentId: 'jobs' },
          },
        ],
        stop_reason: 'tool_use',
      })

      const { ClaudeLLMProvider } = await import('../claude')
      const provider = new ClaudeLLMProvider()
      const result = await provider.chat(
        [{ role: 'user', content: 'write a PRD' }],
        'You are the CEO agent',
        {
          tools: [
            {
              name: 'route_to_agent',
              description: 'Route to agent',
              input_schema: { type: 'object', properties: {} },
            },
          ],
        }
      )

      expect(result.toolUse).toEqual({
        name: 'route_to_agent',
        input: { decisionType: 'delegate_to_agent', targetAgentId: 'jobs' },
      })
      expect(result.stopReason).toBe('tool_use')
    })

    it('should pass tools and maxTokens to Claude API', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
        stop_reason: 'end_turn',
      })

      const { ClaudeLLMProvider } = await import('../claude')
      const provider = new ClaudeLLMProvider()
      await provider.chat(
        [{ role: 'user', content: 'hi' }],
        'System',
        {
          tools: [
            {
              name: 'test_tool',
              description: 'A test tool',
              input_schema: { type: 'object', properties: { foo: { type: 'string' } } },
            },
          ],
          maxTokens: 2048,
        }
      )

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 2048,
          tools: [
            {
              name: 'test_tool',
              description: 'A test tool',
              input_schema: { type: 'object', properties: { foo: { type: 'string' } } },
            },
          ],
        })
      )
    })

    it('should use configured model', async () => {
      process.env.CLAUDE_MODEL = 'claude-haiku-4-20250514'
      process.env.CLAUDE_MAX_TOKENS = '2048'

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
        stop_reason: 'end_turn',
      })

      const { ClaudeLLMProvider } = await import('../claude')
      const provider = new ClaudeLLMProvider()
      await provider.chat(
        [{ role: 'user', content: 'hi' }],
        'System'
      )

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-haiku-4-20250514',
          max_tokens: 2048,
        })
      )
    })
  })
})
