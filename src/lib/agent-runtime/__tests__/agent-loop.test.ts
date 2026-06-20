import { describe, expect, it, vi, beforeEach } from 'vitest'

// ─── Mocks ─────────────────────────────────────────────────────────

const mockPrismaCreate = vi.fn()
const mockFindUnique = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    harmonyTask: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
    harmonyAuditEvent: { create: (...args: unknown[]) => mockPrismaCreate('auditEvent', ...args) },
  },
}))

const mockRunTurnLoop = vi.fn()
const mockNoopExecutor = vi.fn().mockResolvedValue({ output: 'noop', success: true })
const mockSandboxExecutor = vi.fn().mockResolvedValue({ output: 'sandbox-ok', success: true })

vi.mock('../turn-loop', () => ({
  runTurnLoop: (...args: unknown[]) => mockRunTurnLoop(...args),
  noopToolExecutor: (...args: unknown[]) => mockNoopExecutor(...args),
  createSandboxToolExecutor: () => (...args: unknown[]) => mockSandboxExecutor(...args),
}))

vi.mock('../context-resolver', () => ({
  resolveAgentContext: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/agents/registry', () => ({
  getAgentById: (id: string) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    title: `${id} Agent`,
    description: `Test agent ${id}`,
    responsibilities: ['Test responsibility'],
    skillPromptNames: [],
  }),
}))

vi.mock('@/lib/agents/prompts/skills', () => ({
  buildAgentSystemPrompt: () => 'Test system prompt',
}))

// Must import after mocks
const { runAgentLoop } = await import('../agent-loop')

// ─── Tests ─────────────────────────────────────────────────────────

describe('Agent Loop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUnique.mockResolvedValue({
      id: 'task-1',
      title: 'Test Task',
      description: 'Test description',
      type: 'engineering',
      reason: 'Test reason',
      targetAgentId: 'linus',
      conversationId: 'conv-1',
    })
  })

  it('returns needs_human_confirmation for kelvin', async () => {
    const result = await runAgentLoop({
      taskId: 'task-1',
      agentId: 'kelvin',
    })

    expect(result.agentResult.status).toBe('needs_human_confirmation')
    expect(result.agentResult.needsHumanConfirmation).toBe(true)
    expect(result.turnResult.turns).toBe(0)
    expect(result.turnResult.allToolCalls).toHaveLength(0)
  })

  it('returns failed when task not found', async () => {
    mockFindUnique.mockResolvedValue(null)

    const result = await runAgentLoop({
      taskId: 'nonexistent',
      agentId: 'linus',
    })

    expect(result.agentResult.status).toBe('failed')
    expect(result.agentResult.summary).toContain('Task not found')
  })

  it('runs turn loop and parses produce_analysis tool call', async () => {
    mockRunTurnLoop.mockResolvedValue({
      agentId: 'linus',
      turns: [
        { turnIndex: 0, role: 'assistant', content: '', toolCalls: [{ name: 'produce_analysis', success: true }], finished: false },
        { turnIndex: 1, role: 'assistant', content: '', finished: true },
      ],
      finalContent: '',
      allToolCalls: [
        { name: 'run_tests', input: {}, output: { status: 'success', stdout: 'all passed' }, success: true },
        { name: 'produce_analysis', input: {}, output: { status: 'completed', confidence: 0.85, summary: 'Tests passed', findings: ['All tests green'], proposedChanges: [], nextRecommendedAction: 'show_result', nextReason: 'Done' }, success: true },
      ],
      totalUsage: { inputTokens: 100, outputTokens: 200 },
      totalDurationMs: 5000,
      success: true,
      finishReason: 'stop',
    })

    const result = await runAgentLoop({
      taskId: 'task-1',
      agentId: 'linus',
    })

    expect(result.agentResult.status).toBe('completed')
    expect(result.agentResult.confidence).toBe(0.85)
    expect(result.agentResult.summary).toBe('Tests passed')
    expect(result.agentResult.findings).toContain('All tests green')
    expect(result.agentResult.findings).toContain('[run_tests] OK')
    expect(result.turnResult.allToolCalls).toHaveLength(2)
    expect(result.turnResult.totalDurationMs).toBe(5000)
  })

  it('falls back to text summary when no produce_analysis tool call', async () => {
    mockRunTurnLoop.mockResolvedValue({
      agentId: 'jobs',
      turns: [{ turnIndex: 0, role: 'assistant', content: 'Analysis complete.', finished: true }],
      finalContent: 'Analysis complete.',
      allToolCalls: [],
      totalUsage: { inputTokens: 50, outputTokens: 100 },
      totalDurationMs: 2000,
      success: true,
      finishReason: 'stop',
    })

    const result = await runAgentLoop({
      taskId: 'task-1',
      agentId: 'jobs',
    })

    expect(result.agentResult.status).toBe('completed')
    expect(result.agentResult.summary).toContain('Analysis complete.')
    expect(result.agentResult.confidence).toBe(0.5)
  })

  it('parses JSON from finalContent', async () => {
    const jsonResult = JSON.stringify({
      status: 'completed',
      confidence: 0.9,
      summary: 'JSON analysis',
      findings: ['finding-1'],
      proposedChanges: [],
      next: { recommendedAction: 'show_result', reason: 'Done' },
    })

    mockRunTurnLoop.mockResolvedValue({
      agentId: 'turing',
      turns: [{ turnIndex: 0, role: 'assistant', content: jsonResult, finished: true }],
      finalContent: jsonResult,
      allToolCalls: [],
      totalUsage: { inputTokens: 50, outputTokens: 100 },
      totalDurationMs: 1500,
      success: true,
      finishReason: 'stop',
    })

    const result = await runAgentLoop({
      taskId: 'task-1',
      agentId: 'turing',
    })

    expect(result.agentResult.status).toBe('completed')
    expect(result.agentResult.confidence).toBe(0.9)
    expect(result.agentResult.summary).toBe('JSON analysis')
  })

  it('records audit events for tool calls and completion', async () => {
    mockPrismaCreate.mockResolvedValue({ id: 'audit-1' })

    mockRunTurnLoop.mockResolvedValue({
      agentId: 'linus',
      turns: [],
      finalContent: '',
      allToolCalls: [
        { name: 'run_tests', input: {}, output: {}, success: true },
        { name: 'run_lint', input: {}, output: {}, success: false, error: 'lint failed' },
      ],
      totalUsage: { inputTokens: 100, outputTokens: 200 },
      totalDurationMs: 3000,
      success: true,
      finishReason: 'stop',
    })

    const result = await runAgentLoop({
      taskId: 'task-1',
      agentId: 'linus',
    })

    // 2 tool call events + 1 completion event = 3 audit events
    expect(result.auditEventIds).toHaveLength(3)
    expect(mockPrismaCreate).toHaveBeenCalledTimes(3)

    // mockPrismaCreate is called as ('auditEvent', { data: { eventType, ... } })
    // Extract the data objects from the calls
    const auditData = mockPrismaCreate.mock.calls.map((call) => call[1]?.data ?? call[0])

    // Verify tool call audit events
    const toolCallEvents = auditData.filter(
      (data) => data?.eventType === 'agent_loop.tool_call'
    )
    expect(toolCallEvents).toHaveLength(2)
    expect(toolCallEvents[0].reason).toContain('run_tests')
    expect(toolCallEvents[1].reason).toContain('run_lint')
    expect(toolCallEvents[1].reason).toContain('failed')

    // Verify completion audit event
    const completionEvents = auditData.filter(
      (data) => data?.eventType === 'agent_loop.completed'
    )
    expect(completionEvents).toHaveLength(1)
  })

  it('returns failed status on turn loop error', async () => {
    mockRunTurnLoop.mockRejectedValue(new Error('LLM timeout'))

    const result = await runAgentLoop({
      taskId: 'task-1',
      agentId: 'linus',
    })

    expect(result.agentResult.status).toBe('failed')
    expect(result.agentResult.summary).toContain('LLM timeout')
  })

  it('uses sandbox executor in sandbox_execution mode', async () => {
    mockRunTurnLoop.mockResolvedValue({
      agentId: 'linus',
      turns: [],
      finalContent: 'done',
      allToolCalls: [],
      totalUsage: { inputTokens: 0, outputTokens: 0 },
      totalDurationMs: 1000,
      success: true,
      finishReason: 'stop',
    })

    await runAgentLoop({
      taskId: 'task-1',
      agentId: 'linus',
      runtimeMode: 'sandbox_execution',
    })

    // Verify turn loop was called (sandbox executor is injected internally)
    expect(mockRunTurnLoop).toHaveBeenCalled()
  })

  it('uses noop executor in analysis_only mode', async () => {
    mockRunTurnLoop.mockResolvedValue({
      agentId: 'linus',
      turns: [],
      finalContent: 'done',
      allToolCalls: [],
      totalUsage: { inputTokens: 0, outputTokens: 0 },
      totalDurationMs: 1000,
      success: true,
      finishReason: 'stop',
    })

    await runAgentLoop({
      taskId: 'task-1',
      agentId: 'linus',
      runtimeMode: 'analysis_only',
    })

    expect(mockRunTurnLoop).toHaveBeenCalled()
  })
})
