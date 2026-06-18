import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock Prisma
const mockFindMany = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    memoryEntry: { findMany: (...args: unknown[]) => mockFindMany(...args) },
  },
}))

// Must import after mock
const { searchMemory } = await import('../embedding')

describe('Memory Embedding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function makeMemoryEntry(overrides: Record<string, unknown> = {}) {
    return {
      id: 'mem-1',
      idempotencyKey: null,
      status: 'active',
      title: '技术栈选择',
      content: '决定使用 Next.js + Prisma + SQLite 作为技术栈',
      kind: 'project_decision',
      scope: 'project',
      projectId: null,
      taskId: 'task-1',
      agentRunId: null,
      agentId: 'linus',
      sourceType: 'agent_result',
      sourceId: null,
      sourceSnapshotJson: null,
      confidence: 0.9,
      tagsJson: '["技术栈","架构"]',
      supersedesMemoryEntryId: null,
      supersededByMemoryEntryId: null,
      proposedBy: 'agent',
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      createdAt: new Date('2026-06-15'),
      updatedAt: new Date('2026-06-15'),
      ...overrides,
    }
  }

  describe('searchMemory', () => {
    it('returns empty array when no candidates exist', async () => {
      mockFindMany.mockResolvedValue([])
      const results = await searchMemory('技术栈')
      expect(results).toEqual([])
    })

    it('returns results with semantic scores', async () => {
      mockFindMany.mockResolvedValue([
        makeMemoryEntry({
          title: '技术栈选择',
          content: '决定使用 Next.js + Prisma + SQLite',
          tagsJson: '["技术栈","架构"]',
        }),
        makeMemoryEntry({
          id: 'mem-2',
          title: '用户反馈',
          content: '客户希望支持移动端访问',
          tagsJson: '["用户反馈","移动端"]',
        }),
      ])

      const results = await searchMemory('技术架构')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].score).toBeGreaterThan(0)
      expect(results[0].entry.title).toBe('技术栈选择')
    })

    it('ranks keyword matches higher', async () => {
      mockFindMany.mockResolvedValue([
        makeMemoryEntry({
          id: 'mem-1',
          title: '数据库设计',
          content: '使用 PostgreSQL 作为主数据库',
          tagsJson: '["数据库"]',
        }),
        makeMemoryEntry({
          id: 'mem-2',
          title: '技术栈选择',
          content: '决定使用 Next.js + Prisma + SQLite 作为技术栈',
          tagsJson: '["技术栈"]',
        }),
      ])

      const results = await searchMemory('技术栈')
      // "技术栈" 精确匹配应该排在前面
      expect(results[0].entry.title).toBe('技术栈选择')
    })

    it('supports kind filter', async () => {
      mockFindMany.mockResolvedValue([
        makeMemoryEntry({ kind: 'project_decision' }),
        makeMemoryEntry({ id: 'mem-2', kind: 'agent_finding' }),
      ])

      await searchMemory('技术', { kind: 'project_decision' })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ kind: 'project_decision' }),
        })
      )
    })

    it('supports scope filter', async () => {
      mockFindMany.mockResolvedValue([
        makeMemoryEntry({ scope: 'global' }),
      ])

      await searchMemory('技术', { scope: 'global' })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ scope: 'global' }),
        })
      )
    })

    it('supports agentId filter', async () => {
      mockFindMany.mockResolvedValue([
        makeMemoryEntry({ agentId: 'linus' }),
      ])

      await searchMemory('技术', { agentId: 'linus' })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ agentId: 'linus' }),
        })
      )
    })

    it('respects limit option', async () => {
      mockFindMany.mockResolvedValue(
        Array.from({ length: 20 }, (_, i) =>
          makeMemoryEntry({ id: `mem-${i}`, title: `记忆 ${i}` })
        )
      )

      const results = await searchMemory('记忆', { limit: 5 })
      expect(results.length).toBeLessThanOrEqual(5)
    })

    it('filters by minScore', async () => {
      mockFindMany.mockResolvedValue([
        makeMemoryEntry({
          title: '完全无关的内容',
          content: '今天天气很好',
          tagsJson: '[]',
        }),
      ])

      const results = await searchMemory('技术架构', { minScore: 0.5 })
      // 完全无关的内容应该被过滤掉
      expect(results.length).toBe(0)
    })

    it('returns matchType in results', async () => {
      mockFindMany.mockResolvedValue([
        makeMemoryEntry({
          title: '技术栈选择',
          content: '决定使用 Next.js',
          tagsJson: '["技术栈"]',
        }),
      ])

      const results = await searchMemory('技术栈')
      expect(results.length).toBeGreaterThan(0)
      expect(['semantic', 'keyword', 'tag']).toContain(results[0].matchType)
    })

    it('handles Chinese text correctly', async () => {
      mockFindMany.mockResolvedValue([
        makeMemoryEntry({
          title: '用户认证方案',
          content: '使用 JWT Token 进行用户认证',
          tagsJson: '["认证","安全"]',
        }),
      ])

      const results = await searchMemory('用户认证')
      expect(results.length).toBeGreaterThan(0)
    })

    it('handles English text correctly', async () => {
      mockFindMany.mockResolvedValue([
        makeMemoryEntry({
          title: 'API Design',
          content: 'RESTful API design with proper error handling',
          tagsJson: '["api","design"]',
        }),
      ])

      const results = await searchMemory('API design')
      expect(results.length).toBeGreaterThan(0)
    })
  })
})
