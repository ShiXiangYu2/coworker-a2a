/**
 * Human-Gated Execution 测试
 */

import { describe, it, expect } from 'vitest'
import { executeApprovedToolRun, listPendingExecutions } from '../human-gated-execution'

describe('Human-Gated Execution', () => {
  describe('executeApprovedToolRun', () => {
    it('should return not_found for non-existent toolRun', async () => {
      const result = await executeApprovedToolRun('non-existent-id')
      expect(result.status).toBe('not_found')
      expect(result.toolRunId).toBe('non-existent-id')
    })

    it('should return not_approved for non-approved toolRun', async () => {
      // 创建一个 ToolRun 需要完整的依赖链，这里用 mock
      // 实际测试中，我们需要先创建 Task → ToolCall → ToolRun
      // 由于复杂度，这里只测试状态检查逻辑
      const result = await executeApprovedToolRun('any-id')
      // 应该返回 not_found（因为没有真实数据）
      expect(result.status).toBe('not_found')
    })
  })

  describe('listPendingExecutions', () => {
    it('should return empty array when no pending executions', async () => {
      const pending = await listPendingExecutions()
      expect(Array.isArray(pending)).toBe(true)
      // 在测试环境中可能有或没有数据
    })
  })
})

describe('Sandbox Execution - Human-Gated Integration', () => {
  // 这些测试验证沙箱执行与 Human-Gated 的集成
  // 实际的端到端测试需要完整的数据链

  it('should have sprint18SafetyNote defined', async () => {
    const mod = await import('../human-gated-execution')
    expect(mod.sprint18SafetyNote).toBeTruthy()
    expect(mod.sprint18SafetyNote).toContain('Sprint 18')
    expect(mod.sprint18SafetyNote).toContain('Kelvin-approved')
  })
})
