import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock Prisma
const mockFindMany = vi.fn()
const mockSearchMemory = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    agentRun: { findMany: (...args: unknown[]) => mockFindMany('agentRun', ...args) },
    a2AMessage: { findMany: (...args: unknown[]) => mockFindMany('a2aMessage', ...args) },
    memoryEntry: { findMany: (...args: unknown[]) => mockFindMany('memoryEntry', ...args) },
  },
}))

vi.mock('@/lib/memory/embedding', () => ({
  searchMemory: (...args: unknown[]) => mockSearchMemory(...args),
}))

// Must import after mock
const { resolveAgentContext } = await import('../context-resolver')

describe('Context Resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchMemory.mockResolvedValue([])
  })

  it('returns null when conversationId is not provided', async () => {
    const result = await resolveAgentContext('jobs', 'task-1', null)
    expect(result).toBeNull()
  })

  it('returns null when no context data is found', async () => {
    mockFindMany.mockResolvedValue([])
    const result = await resolveAgentContext('jobs', 'task-1', 'conv-1')
    expect(result).toBeNull()
    expect(mockFindMany).toHaveBeenCalledTimes(4)
  })

  it('assembles completed AgentResults into context', async () => {
    mockFindMany
      // agentRun query
      .mockResolvedValueOnce([
        {
          agentId: 'linus',
          resultJson: JSON.stringify({
            summary: 'API 设计完成，定义了 5 个端点',
            findings: ['RESTful 规范遵循良好', '缺少分页支持'],
          }),
          task: { title: '设计用户认证 API', id: 'task-2' },
        },
        {
          agentId: 'turing',
          resultJson: JSON.stringify({
            summary: '代码审查通过，有 2 个建议',
            findings: ['建议添加错误处理'],
          }),
          task: { title: '审查认证模块', id: 'task-3' },
        },
      ])
      // a2aMessage query
      .mockResolvedValueOnce([])
      // memoryEntry query
      .mockResolvedValueOnce([])

    const result = await resolveAgentContext('jobs', 'task-1', 'conv-1')

    expect(result).not.toBeNull()
    expect(result!.stats.completedResults).toBe(2)
    expect(result!.context).toContain('linus')
    expect(result!.context).toContain('turing')
    expect(result!.context).toContain('API 设计完成')
    expect(result!.context).toContain('代码审查通过')
    expect(result!.context).toContain('其他 Agent 的已完成分析')
  })

  it('assembles A2A messages into context', async () => {
    mockFindMany
      // agentRun query
      .mockResolvedValueOnce([])
      // a2aMessage query
      .mockResolvedValueOnce([
        {
          fromAgentId: 'elon',
          toAgentId: 'jobs',
          intent: 'handoff',
          subject: '需求已明确，请开始产品设计',
          body: '用户希望实现一个任务提醒功能，优先级为 P0',
        },
      ])
      // memoryEntry query
      .mockResolvedValueOnce([])

    const result = await resolveAgentContext('jobs', 'task-1', 'conv-1')

    expect(result).not.toBeNull()
    expect(result!.stats.a2aMessages).toBe(1)
    expect(result!.context).toContain('elon → jobs')
    expect(result!.context).toContain('handoff')
    expect(result!.context).toContain('Agent 间通信记录')
  })

  it('assembles memory entries into context', async () => {
    mockFindMany
      // agentRun query
      .mockResolvedValueOnce([])
      // a2aMessage query
      .mockResolvedValueOnce([])
      // memoryEntry query (current task)
      .mockResolvedValueOnce([
        {
          kind: 'project_decision',
          title: '技术栈选择',
          content: '决定使用 Next.js + Prisma + SQLite',
        },
      ])

    const result = await resolveAgentContext('jobs', 'task-1', 'conv-1')

    expect(result).not.toBeNull()
    expect(result!.stats.memoryEntries).toBe(1)
    expect(result!.context).toContain('project_decision')
    expect(result!.context).toContain('技术栈选择')
    expect(result!.context).toContain('相关记忆')
  })

  it('redacts sensitive information from context', async () => {
    mockFindMany
      .mockResolvedValueOnce([
        {
          agentId: 'linus',
          resultJson: JSON.stringify({
            summary: 'API 密钥为 sk-abc123def456ghi789jkl012mno',
            findings: [],
          }),
          task: { title: '配置 API', id: 'task-2' },
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await resolveAgentContext('jobs', 'task-1', 'conv-1')

    expect(result).not.toBeNull()
    expect(result!.context).not.toContain('sk-abc123def456ghi789jkl012mno')
    expect(result!.context).toContain('[REDACTED]')
  })

  it('respects MAX_CONTEXT_LENGTH limit', async () => {
    // 创建一个很长的结果
    const longSummary = 'x'.repeat(500)
    mockFindMany
      .mockResolvedValueOnce(
        Array.from({ length: 20 }, (_, i) => ({
          agentId: `agent-${i}`,
          resultJson: JSON.stringify({
            summary: longSummary,
            findings: [`finding-${i}`],
          }),
          task: { title: `Task ${i}`, id: `task-${i}` },
        }))
      )
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await resolveAgentContext('jobs', 'task-1', 'conv-1')

    expect(result).not.toBeNull()
    expect(result!.context.length).toBeLessThanOrEqual(4000)
  })

  it('excludes current agent from history', async () => {
    mockFindMany
      .mockResolvedValueOnce([
        {
          agentId: 'jobs', // 同一个 agent
          resultJson: JSON.stringify({ summary: '自己之前的分析', findings: [] }),
          task: { title: '之前的任务', id: 'task-prev' },
        },
        {
          agentId: 'linus',
          resultJson: JSON.stringify({ summary: '其他 agent 的分析', findings: [] }),
          task: { title: '其他任务', id: 'task-other' },
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const result = await resolveAgentContext('jobs', 'task-1', 'conv-1')

    expect(result).not.toBeNull()
    expect(result!.context).not.toContain('自己之前的分析')
    expect(result!.context).toContain('其他 agent 的分析')
  })

  it('falls back to conversation-wide memory when task has no memory', async () => {
    mockFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      // First call: task-specific memory (empty)
      .mockResolvedValueOnce([])
      // Second call: conversation-wide memory
      .mockResolvedValueOnce([
        {
          kind: 'workflow_note',
          title: '项目规范',
          content: '使用 TypeScript strict 模式',
        },
      ])

    const result = await resolveAgentContext('jobs', 'task-1', 'conv-1')

    expect(result).not.toBeNull()
    expect(result!.stats.memoryEntries).toBe(1)
    expect(result!.context).toContain('项目规范')
  })
  it('excludes current agent semantic memory and falls back to conversation-wide memory', async () => {
    mockSearchMemory.mockResolvedValueOnce([
      {
        entry: {
          agentId: 'jobs',
          kind: 'workflow_note',
          title: 'Self memory',
          content: 'Current agent memory should not be injected',
        },
        score: 0.9,
      },
    ])

    mockFindMany
      .mockResolvedValueOnce([
        {
          agentId: 'linus',
          resultJson: JSON.stringify({ summary: 'Other agent result', findings: [] }),
          task: { title: 'Shared task context', id: 'task-other' },
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          kind: 'workflow_note',
          title: 'Other memory',
          content: 'Conversation memory from another agent',
        },
      ])

    const result = await resolveAgentContext('jobs', 'task-1', 'conv-1')

    expect(result).not.toBeNull()
    expect(result!.context).not.toContain('Self memory')
    expect(result!.context).not.toContain('Current agent memory should not be injected')
    expect(result!.context).toContain('Other memory')
  })
})
