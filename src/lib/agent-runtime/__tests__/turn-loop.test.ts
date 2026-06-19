/**
 * Agent Turn Loop 测试
 *
 * 覆盖：单轮完成、多轮工具调用、达到上限终止、超时终止、Kelvin 拒绝
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  runTurnLoop,
  noopToolExecutor,
  type TurnLoopConfig,
  type ToolExecutor,
} from '../turn-loop'

// ─── Mock LLM Provider ────────────────────────────────────────────

// 存储 mock 响应队列
let mockResponses: Array<{
  content?: string
  toolUse?: { name: string; input: Record<string, unknown> }
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens'
}> = []

vi.mock('@/lib/llm', () => ({
  getLLMProvider: () => ({
    name: 'mock',
    chat: vi.fn().mockImplementation(async () => {
      if (mockResponses.length === 0) {
        return { content: 'Done.', toolUse: undefined, stopReason: 'end_turn' as const }
      }
      return mockResponses.shift()!
    }),
    streamChat: vi.fn(),
  }),
}))

// ─── Setup ─────────────────────────────────────────────────────────

beforeEach(() => {
  mockResponses = []
})

// ─── noopToolExecutor 测试 ────────────────────────────────────────

describe('noopToolExecutor', () => {
  it('返回成功结果', async () => {
    const result = await noopToolExecutor('test.tool', { key: 'value' })
    expect(result.success).toBe(true)
    expect(result.output).toBeDefined()
  })
})

// ─── Kelvin 拒绝测试 ──────────────────────────────────────────────

describe('runTurnLoop - Kelvin', () => {
  it('拒绝 Kelvin Agent，返回错误结果', async () => {
    const result = await runTurnLoop('kelvin', 'task-1', [
      { role: 'user', content: 'Hello' },
    ])

    expect(result.success).toBe(false)
    expect(result.finishReason).toBe('error')
    expect(result.turns).toEqual([])
  })
})

// ─── 单轮完成测试 ─────────────────────────────────────────────────

describe('runTurnLoop - 单轮完成', () => {
  it('LLM 返回纯文本时，一轮完成', async () => {
    mockResponses.push({
      content: 'Analysis complete.',
      stopReason: 'end_turn',
    })

    const result = await runTurnLoop('jobs', 'task-1', [
      { role: 'user', content: 'Analyze this task' },
    ], { maxTurns: 5 })

    expect(result.success).toBe(true)
    expect(result.finishReason).toBe('stop')
    expect(result.turns).toHaveLength(1)
    expect(result.turns[0].content).toBe('Analysis complete.')
    expect(result.turns[0].role).toBe('assistant')
    expect(result.finalContent).toBe('Analysis complete.')
  })

  it('LLM 返回空内容也算完成', async () => {
    mockResponses.push({
      content: '',
      stopReason: 'end_turn',
    })

    const result = await runTurnLoop('jobs', 'task-1', [
      { role: 'user', content: 'Hello' },
    ])

    expect(result.success).toBe(true)
    expect(result.turns).toHaveLength(1)
  })
})

// ─── 多轮工具调用测试 ─────────────────────────────────────────────

describe('runTurnLoop - 多轮工具调用', () => {
  it('LLM 调用工具后返回文本，两轮完成', async () => {
    // 第一轮：LLM 请求调用工具
    mockResponses.push({
      content: '',
      toolUse: { name: 'noop.note', input: { note: 'test note' } },
      stopReason: 'tool_use',
    })
    // 第二轮：LLM 返回最终文本
    mockResponses.push({
      content: 'Tool executed, analysis complete.',
      stopReason: 'end_turn',
    })

    const toolExecutor: ToolExecutor = vi.fn().mockResolvedValue({
      output: { recorded: true },
      success: true,
    })

    const result = await runTurnLoop('jobs', 'task-1', [
      { role: 'user', content: 'Record a note and analyze' },
    ], { maxTurns: 5 }, toolExecutor)

    expect(result.success).toBe(true)
    expect(result.turns).toHaveLength(2)
    expect(result.allToolCalls).toHaveLength(1)
    expect(result.allToolCalls[0].name).toBe('noop.note')
    expect(result.allToolCalls[0].success).toBe(true)
    expect(result.finalContent).toBe('Tool executed, analysis complete.')
    expect(toolExecutor).toHaveBeenCalledWith('noop.note', { note: 'test note' })
  })

  it('连续调用多个工具后完成', async () => {
    // 第一轮：工具调用 A
    mockResponses.push({
      content: '',
      toolUse: { name: 'noop.note', input: { note: 'step 1' } },
      stopReason: 'tool_use',
    })
    // 第二轮：工具调用 B
    mockResponses.push({
      content: '',
      toolUse: { name: 'noop.note', input: { note: 'step 2' } },
      stopReason: 'tool_use',
    })
    // 第三轮：最终文本
    mockResponses.push({
      content: 'All steps completed.',
      stopReason: 'end_turn',
    })

    const toolExecutor: ToolExecutor = vi.fn().mockResolvedValue({
      output: { ok: true },
      success: true,
    })

    const result = await runTurnLoop('linus', 'task-1', [
      { role: 'user', content: 'Do two steps' },
    ], { maxTurns: 5 }, toolExecutor)

    expect(result.success).toBe(true)
    expect(result.turns).toHaveLength(3)
    expect(result.allToolCalls).toHaveLength(2)
    expect(result.finalContent).toBe('All steps completed.')
  })
})

// ─── 达到上限终止测试 ─────────────────────────────────────────────

describe('runTurnLoop - 达到上限终止', () => {
  it('达到 maxTurns 时终止', async () => {
    // 持续返回工具调用，不返回文本
    for (let i = 0; i < 10; i++) {
      mockResponses.push({
        content: '',
        toolUse: { name: 'noop.note', input: { note: `loop ${i}` } },
        stopReason: 'tool_use',
      })
    }

    const toolExecutor: ToolExecutor = vi.fn().mockResolvedValue({
      output: { ok: true },
      success: true,
    })

    const result = await runTurnLoop('jobs', 'task-1', [
      { role: 'user', content: 'Infinite loop test' },
    ], { maxTurns: 3 }, toolExecutor)

    expect(result.success).toBe(false)
    expect(result.finishReason).toBe('max_turns')
    expect(result.turns).toHaveLength(3)
    expect(result.allToolCalls).toHaveLength(3)
  })
})

// ─── 超时终止测试 ─────────────────────────────────────────────────

describe('runTurnLoop - 超时终止', () => {
  it('超过 timeoutMs 时终止', async () => {
    // Mock 一个很慢的 LLM 响应
    let callCount = 0
    vi.mocked((await import('@/lib/llm')).getLLMProvider().chat).mockImplementation(
      async () => {
        callCount++
        if (callCount === 1) {
          // 第一次调用：正常返回工具调用
          return {
            content: '',
            toolUse: { name: 'noop.note', input: { note: 'slow' } },
            stopReason: 'tool_use',
          }
        }
        // 第二次调用：模拟超时（通过延迟）
        await new Promise((resolve) => setTimeout(resolve, 200))
        return {
          content: 'Finally done.',
          stopReason: 'end_turn',
        }
      },
    )

    const toolExecutor: ToolExecutor = vi.fn().mockResolvedValue({
      output: { ok: true },
      success: true,
    })

    const result = await runTurnLoop('jobs', 'task-1', [
      { role: 'user', content: 'Timeout test' },
    ], { maxTurns: 10, timeoutMs: 50 }, toolExecutor)

    // 应该在超时后终止
    expect(result.finishReason).toBe('timeout')
  })
})

// ─── 工具执行错误测试 ─────────────────────────────────────────────

describe('runTurnLoop - 工具执行错误', () => {
  it('工具执行失败时记录错误并继续', async () => {
    mockResponses.push({
      content: '',
      toolUse: { name: 'failing.tool', input: {} },
      stopReason: 'tool_use',
    })
    mockResponses.push({
      content: 'Recovery after error.',
      stopReason: 'end_turn',
    })

    const toolExecutor: ToolExecutor = vi.fn().mockRejectedValue(
      new Error('Tool execution failed'),
    )

    const result = await runTurnLoop('linus', 'task-1', [
      { role: 'user', content: 'Test error handling' },
    ], { maxTurns: 5 }, toolExecutor)

    expect(result.success).toBe(true)
    expect(result.allToolCalls).toHaveLength(1)
    expect(result.allToolCalls[0].success).toBe(false)
    expect(result.allToolCalls[0].error).toBe('Tool execution failed')
    expect(result.finalContent).toBe('Recovery after error.')
  })
})

// ─── LLM 错误测试 ────────────────────────────────────────────────

describe('runTurnLoop - LLM 错误', () => {
  it('LLM 调用失败时返回错误结果', async () => {
    vi.mocked((await import('@/lib/llm')).getLLMProvider().chat).mockRejectedValue(
      new Error('API rate limit'),
    )

    const result = await runTurnLoop('jobs', 'task-1', [
      { role: 'user', content: 'Error test' },
    ])

    expect(result.success).toBe(false)
    expect(result.finishReason).toBe('error')
    expect(result.turns).toHaveLength(1)
  })
})

// ─── 默认配置测试 ─────────────────────────────────────────────────

describe('runTurnLoop - 默认配置', () => {
  it('使用默认配置时 maxTurns=10', async () => {
    // 持续返回工具调用
    for (let i = 0; i < 15; i++) {
      mockResponses.push({
        content: '',
        toolUse: { name: 'noop.note', input: { note: `${i}` } },
        stopReason: 'tool_use',
      })
    }

    const toolExecutor: ToolExecutor = vi.fn().mockResolvedValue({
      output: { ok: true },
      success: true,
    })

    const result = await runTurnLoop('jobs', 'task-1', [
      { role: 'user', content: 'Default config test' },
    ], {}, toolExecutor)

    // 默认 maxTurns=10，但可能因超时提前终止
    expect(result.turns.length).toBeLessThanOrEqual(10)
  })
})
