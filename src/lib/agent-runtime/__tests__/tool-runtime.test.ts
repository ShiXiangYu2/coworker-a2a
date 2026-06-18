import { describe, expect, it } from 'vitest'
import { executeToolCall, MAX_TOOL_CALLS } from '../tool-runtime'

describe('Tool Runtime', () => {
  describe('read.project_context', () => {
    it('returns context items when available', async () => {
      const result = await executeToolCall(
        'read.project_context',
        { scope: 'all' },
        {
          contextPacket: {
            items: [
              { type: 'memory', content: 'User prefers dark mode', source: 'memory-1' },
              { type: 'knowledge', content: 'Tech stack is Next.js + Prisma', source: 'kb-1' },
            ],
          },
        }
      )

      expect(result.toolName).toBe('read.project_context')
      expect(result.result.status).toBe('success')
      expect(result.result.confidence).toBe(0.9)
      expect(result.result.data).toBeDefined()
      const data = result.result.data as { items: Array<{ type: string }>; totalTokens: number }
      expect(data.items).toHaveLength(2)
      expect(data.totalTokens).toBeGreaterThan(0)
    })

    it('filters by scope', async () => {
      const result = await executeToolCall(
        'read.project_context',
        { scope: 'memory' },
        {
          contextPacket: {
            items: [
              { type: 'memory', content: 'User prefers dark mode', source: 'memory-1' },
              { type: 'knowledge', content: 'Tech stack is Next.js', source: 'kb-1' },
            ],
          },
        }
      )

      const data = result.result.data as { items: Array<{ type: string }> }
      expect(data.items).toHaveLength(1)
      expect(data.items[0].type).toBe('memory')
    })

    it('returns empty result when no context items', async () => {
      const result = await executeToolCall(
        'read.project_context',
        { scope: 'all' },
        { contextPacket: { items: [] } }
      )

      expect(result.result.status).toBe('success')
      expect(result.result.confidence).toBe(0.5)
      const data = result.result.data as { items: unknown[] }
      expect(data.items).toHaveLength(0)
    })

    it('returns empty result when contextPacket is undefined', async () => {
      const result = await executeToolCall(
        'read.project_context',
        { scope: 'all' },
        {}
      )

      expect(result.result.status).toBe('success')
      const data = result.result.data as { items: unknown[] }
      expect(data.items).toHaveLength(0)
    })

    it('truncates long content to 2000 chars', async () => {
      const longContent = 'x'.repeat(5000)
      const result = await executeToolCall(
        'read.project_context',
        { scope: 'all' },
        {
          contextPacket: {
            items: [{ type: 'memory', content: longContent }],
          },
        }
      )

      const data = result.result.data as { items: Array<{ content: string }> }
      expect(data.items[0].content.length).toBeLessThanOrEqual(2000)
    })
  })

  describe('unknown tools', () => {
    it('rejects unknown tools', async () => {
      const result = await executeToolCall(
        'write.file',
        { path: '/tmp/test.txt' },
        {}
      )

      expect(result.result.status).toBe('failed')
      expect(result.result.summary).toContain('not supported')
    })

    it('rejects shell commands', async () => {
      const result = await executeToolCall(
        'command.shell',
        { command: 'rm -rf /' },
        {}
      )

      expect(result.result.status).toBe('failed')
    })
  })

  describe('constants', () => {
    it('has MAX_TOOL_CALLS of 3', () => {
      expect(MAX_TOOL_CALLS).toBe(3)
    })
  })
})
