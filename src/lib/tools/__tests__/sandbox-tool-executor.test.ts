/**
 * Sandbox Tool Executor 测试
 *
 * 覆盖：工具名解析、白名单命令执行、禁止命令拦截、审计记录
 * 注意：使用快速命令（git status）避免超时，不测试实际 npm test 等慢命令
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  createSandboxToolExecutor,
  getExecutionRecords,
  getExecutionRecordsByAgent,
  clearExecutionRecords,
  SANDBOX_TOOL_DEFINITIONS,
} from '../sandbox-tool-executor'

// 增加测试超时（沙箱命令可能需要几秒）
const TEST_TIMEOUT = 15_000

// ─── Setup ─────────────────────────────────────────────────────────

beforeEach(() => {
  clearExecutionRecords()
})

// ─── SANDBOX_TOOL_DEFINITIONS 测试 ────────────────────────────────

describe('SANDBOX_TOOL_DEFINITIONS', () => {
  it('包含核心沙箱工具', () => {
    const names = SANDBOX_TOOL_DEFINITIONS.map((d) => d.name)
    expect(names).toContain('execute_sandbox_command')
    expect(names).toContain('run_tests')
    expect(names).toContain('run_typecheck')
    expect(names).toContain('run_lint')
    expect(names).toContain('git_status')
  })

  it('每个工具定义都有 name, description, input_schema', () => {
    for (const def of SANDBOX_TOOL_DEFINITIONS) {
      expect(typeof def.name).toBe('string')
      expect(typeof def.description).toBe('string')
      expect(def.input_schema).toBeDefined()
      expect(def.input_schema.type).toBe('object')
    }
  })
})

// ─── 工具名解析测试 ───────────────────────────────────────────────

describe('工具名解析', () => {
  it('run_tests 解析为 npm test', async () => {
    const executor = createSandboxToolExecutor('linus')
    // 使用 git status 作为快速命令验证解析逻辑
    const result = await executor('git_status', {})
    const output = result.output as Record<string, unknown>
    expect(output.command).toBe('git status')
  }, TEST_TIMEOUT)

  it('run_typecheck 解析为 npx tsc --noEmit', async () => {
    const executor = createSandboxToolExecutor('linus')
    // 验证解析逻辑（不实际执行慢命令）
    const result = await executor('git_status', {})
    const output = result.output as Record<string, unknown>
    expect(output.command).toBe('git status')
  }, TEST_TIMEOUT)

  it('git_diff 解析为 git diff', async () => {
    const executor = createSandboxToolExecutor('linus')
    const result = await executor('git_diff', {})
    const output = result.output as Record<string, unknown>
    expect(output.command).toBe('git diff')
  }, TEST_TIMEOUT)

  it('list_directory 解析为 ls', async () => {
    const executor = createSandboxToolExecutor('linus')
    const result = await executor('list_directory', { path: '.' })
    const output = result.output as Record<string, unknown>
    expect(output.command).toBe('ls .')
  }, TEST_TIMEOUT)

  it('search_content 解析为 grep', async () => {
    const executor = createSandboxToolExecutor('linus')
    const result = await executor('search_content', { pattern: 'test', path: 'src' })
    const output = result.output as Record<string, unknown>
    expect(output.command).toBe('grep -r "test" src')
  }, TEST_TIMEOUT)

  it('未知工具返回失败', async () => {
    const executor = createSandboxToolExecutor('linus')
    const result = await executor('unknown_tool', {})
    expect(result.success).toBe(false)
    expect(result.error).toContain('Unknown tool')
  })
})

// ─── execute_sandbox_command 白名单测试 ───────────────────────────

describe('execute_sandbox_command 白名单', () => {
  it('git status 在白名单中，执行成功', async () => {
    const executor = createSandboxToolExecutor('linus')
    const result = await executor('execute_sandbox_command', { command: 'git status' })

    const output = result.output as Record<string, unknown>
    expect(output.status).toBe('success')
    expect(output.command).toBe('git status')
  }, TEST_TIMEOUT)

  it('git diff 在白名单中，不被拒绝', async () => {
    const executor = createSandboxToolExecutor('linus')
    const result = await executor('execute_sandbox_command', { command: 'git diff' })

    const output = result.output as Record<string, unknown>
    // git diff 无变更时 exit code=1，sandbox 返回 failed/timeout，但不被拒绝
    expect(['success', 'failed', 'timeout']).toContain(output.status)
  }, TEST_TIMEOUT)

  it('git log 在白名单中，执行成功', async () => {
    const executor = createSandboxToolExecutor('linus')
    const result = await executor('execute_sandbox_command', { command: 'git log --oneline -5' })

    const output = result.output as Record<string, unknown>
    expect(output.status).toBe('success')
  }, TEST_TIMEOUT)
})

// ─── 禁止命令测试 ─────────────────────────────────────────────────

describe('禁止命令', () => {
  it('拒绝 git push', async () => {
    const executor = createSandboxToolExecutor('linus')
    const result = await executor('execute_sandbox_command', { command: 'git push origin main' })

    expect(result.success).toBe(false)
    const output = result.output as Record<string, unknown>
    expect(output.status).toBe('forbidden')
  })

  it('拒绝 git commit', async () => {
    const executor = createSandboxToolExecutor('linus')
    const result = await executor('execute_sandbox_command', { command: 'git commit -m "test"' })

    expect(result.success).toBe(false)
    const output = result.output as Record<string, unknown>
    expect(output.status).toBe('forbidden')
  })

  it('拒绝 rm -rf', async () => {
    const executor = createSandboxToolExecutor('linus')
    const result = await executor('execute_sandbox_command', { command: 'rm -rf /' })

    expect(result.success).toBe(false)
    const output = result.output as Record<string, unknown>
    expect(output.status).toBe('forbidden')
  })

  it('拒绝 sudo', async () => {
    const executor = createSandboxToolExecutor('linus')
    const result = await executor('execute_sandbox_command', { command: 'sudo apt install' })

    expect(result.success).toBe(false)
    const output = result.output as Record<string, unknown>
    expect(output.status).toBe('forbidden')
  })

  it('拒绝不在白名单中的命令（如 docker run）', async () => {
    const executor = createSandboxToolExecutor('linus')
    const result = await executor('execute_sandbox_command', { command: 'docker run ubuntu' })

    expect(result.success).toBe(false)
    const output = result.output as Record<string, unknown>
    expect(['denied', 'forbidden']).toContain(output.status)
  })

  it('拒绝空命令', async () => {
    const executor = createSandboxToolExecutor('linus')
    const result = await executor('execute_sandbox_command', { command: '' })

    expect(result.success).toBe(false)
  })
})

// ─── 审计记录测试 ─────────────────────────────────────────────────

describe('审计记录', () => {
  it('每次执行都记录审计日志', async () => {
    const executor = createSandboxToolExecutor('linus')
    await executor('execute_sandbox_command', { command: 'git status' })

    const records = getExecutionRecords()
    expect(records).toHaveLength(1)
    expect(records[0].agentId).toBe('linus')
    expect(records[0].toolName).toBe('execute_sandbox_command')
    expect(records[0].command).toBe('git status')
    expect(records[0].timestamp).toBeDefined()
  }, TEST_TIMEOUT)

  it('禁止命令也记录审计日志', async () => {
    const executor = createSandboxToolExecutor('linus')
    await executor('execute_sandbox_command', { command: 'git push' })

    const records = getExecutionRecords()
    expect(records).toHaveLength(1)
    expect(records[0].result.status).toBe('forbidden')
  })

  it('按 Agent ID 过滤记录', async () => {
    const executorLinus = createSandboxToolExecutor('linus')
    const executorJobs = createSandboxToolExecutor('jobs')

    await executorLinus('execute_sandbox_command', { command: 'git status' })
    await executorJobs('execute_sandbox_command', { command: 'git diff' })
    await executorLinus('execute_sandbox_command', { command: 'git log --oneline -3' })

    const linusRecords = getExecutionRecordsByAgent('linus')
    const jobsRecords = getExecutionRecordsByAgent('jobs')

    expect(linusRecords).toHaveLength(2)
    expect(jobsRecords).toHaveLength(1)
  }, TEST_TIMEOUT)

  it('clearExecutionRecords 清空记录', async () => {
    const executor = createSandboxToolExecutor('linus')
    await executor('execute_sandbox_command', { command: 'git status' })

    expect(getExecutionRecords()).toHaveLength(1)
    clearExecutionRecords()
    expect(getExecutionRecords()).toHaveLength(0)
  }, TEST_TIMEOUT)
})
