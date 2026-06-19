/**
 * Code Quality Demo Scenario 测试
 *
 * 覆盖：路由决策、Agent 分析、沙箱工具执行、交付物写入
 * 注意：使用 mock LLM 避免真实 API 调用
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { LLMChatResult } from '@/lib/llm/types'

// Mock LLM provider
const mockChat = vi.fn()

vi.mock('@/lib/llm', () => ({
  getLLMProvider: () => ({
    name: 'mock',
    chat: mockChat,
    streamChat: vi.fn(),
  }),
}))

// Mock runtime config to use analysis_only mode
vi.mock('@/lib/agent-runtime/types', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/agent-runtime/types')>()
  return {
    ...mod,
    agentRuntimeConfig: {
      ...mod.agentRuntimeConfig,
      mode: 'analysis_only' as const,
    },
  }
})

const { runCodeQualityDemo } = await import('../code-quality')
const { clearExecutionRecords } = await import('@/lib/tools/sandbox-tool-executor')

beforeEach(() => {
  vi.clearAllMocks()
  clearExecutionRecords()
})

function mockLLMSuccess() {
  mockChat.mockResolvedValueOnce({
    content: '',
    toolUse: {
      name: 'produce_analysis',
      input: {
        status: 'completed',
        confidence: 0.85,
        summary: 'Code quality analysis completed. Lint and typecheck passed.',
        findings: ['No critical issues found', 'Minor lint warnings in 3 files'],
        proposedChanges: [],
        nextRecommendedAction: 'show_result',
        nextReason: 'Analysis complete.',
      },
    },
    stopReason: 'tool_use',
  } satisfies LLMChatResult)
}

describe('Code Quality Demo Scenario', () => {
  it('routes to linus for code quality request', async () => {
    mockLLMSuccess()

    const result = await runCodeQualityDemo({
      message: '帮我分析这个项目的代码质量',
    })

    expect(result.routeDecision.targetAgentId).toBe('linus')
    expect(result.routeDecision.decisionType).toBe('delegate_to_agent')
  }, 30_000)

  it('produces agent result from LLM', async () => {
    mockLLMSuccess()

    const result = await runCodeQualityDemo({
      message: '帮我分析这个项目的代码质量',
    })

    expect(result.agentResult.status).toBe('completed')
    expect(result.agentResult.confidence).toBe(0.85)
    expect(result.agentResult.summary).toContain('Code quality')
  }, 30_000)

  it('executes sandbox tools (lint + typecheck)', async () => {
    mockLLMSuccess()

    const result = await runCodeQualityDemo({
      message: '帮我分析这个项目的代码质量',
    })

    expect(result.toolExecutions).toHaveLength(2)
    expect(result.toolExecutions[0].tool).toBe('run_lint')
    expect(result.toolExecutions[1].tool).toBe('run_typecheck')
  }, 30_000)

  it('writes report to deliverables', async () => {
    mockLLMSuccess()

    const result = await runCodeQualityDemo({
      message: '帮我分析这个项目的代码质量',
    })

    expect(result.deliverables).toHaveLength(1)
    expect(result.deliverables[0].path).toContain('code-quality-report.md')
    expect(result.deliverables[0].size).toBeGreaterThan(0)
  }, 30_000)

  it('completes all steps', async () => {
    mockLLMSuccess()

    const result = await runCodeQualityDemo({
      message: '帮我分析这个项目的代码质量',
    })

    expect(result.steps.length).toBeGreaterThanOrEqual(4)
    expect(result.steps.every((s) => s.status === 'completed' || s.status === 'failed')).toBe(true)
    expect(result.totalDurationMs).toBeGreaterThan(0)
  }, 30_000)

  it('succeeds end-to-end', async () => {
    mockLLMSuccess()

    const result = await runCodeQualityDemo({
      message: '帮我分析这个项目的代码质量',
    })

    expect(result.success).toBe(true)
  }, 30_000)
})
