import { describe, it, expect, beforeEach } from 'vitest'
import { getLLMProvider, resetLLMProvider } from '../index'
import { MockLLMProvider } from '../mock'

describe('LLM Provider', () => {
  beforeEach(() => {
    resetLLMProvider()
    process.env.LLM_PROVIDER = 'mock'
  })

  describe('getLLMProvider', () => {
    it('should return MockProvider when LLM_PROVIDER=mock', () => {
      process.env.LLM_PROVIDER = 'mock'
      const provider = getLLMProvider()
      expect(provider).toBeInstanceOf(MockLLMProvider)
      expect(provider.name).toBe('mock')
    })

    it('should return MockProvider as default', () => {
      delete process.env.LLM_PROVIDER
      const provider = getLLMProvider()
      expect(provider).toBeInstanceOf(MockLLMProvider)
    })

    it('should return same instance on multiple calls (singleton)', () => {
      const provider1 = getLLMProvider()
      const provider2 = getLLMProvider()
      expect(provider1).toBe(provider2)
    })
  })

  describe('MockLLMProvider', () => {
    it('should yield start event first', async () => {
      const provider = new MockLLMProvider()
      const gen = provider.streamChat(
        [{ role: 'user', content: 'hello' }],
        'You are a helpful assistant'
      )

      const firstEvent = await gen.next()
      expect(firstEvent.value).toEqual({
        type: 'start',
      })
    })

    it('should yield delta events with content', async () => {
      const provider = new MockLLMProvider()
      const gen = provider.streamChat(
        [{ role: 'user', content: 'hello' }],
        'You are a helpful assistant'
      )

      // Skip start event
      await gen.next()

      // Collect delta events
      const deltas: string[] = []
      let done = false
      while (!done) {
        const result = await gen.next()
        if (result.value?.type === 'delta') {
          deltas.push(result.value.content)
        }
        if (result.value?.type === 'done' || result.done) {
          done = true
        }
      }

      expect(deltas.length).toBeGreaterThan(0)
      const fullResponse = deltas.join('')
      expect(fullResponse).toContain('Mock')
    })

    it('should yield done event last', async () => {
      const provider = new MockLLMProvider()
      const gen = provider.streamChat(
        [{ role: 'user', content: 'hello' }],
        'You are a helpful assistant'
      )

      let lastEvent = null
      for await (const event of gen) {
        lastEvent = event
      }

      expect(lastEvent).toEqual({
        type: 'done',
      })
    })
  })
})
