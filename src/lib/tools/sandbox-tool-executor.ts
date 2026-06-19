/**
 * Sandbox Tool Executor — 沙箱工具执行器
 *
 * 来源：对接 sandbox-execution.ts 的 executeInSandbox
 * 目的：让 TurnLoop 能在沙箱内执行白名单命令
 *
 * 安全边界：
 * - 只执行白名单命令（test, lint, git-read, file-read, database, build）
 * - 超时 30s，输出截断 12KB
 * - 禁止 git push/commit/merge、文件写入、外部 API
 * - 每次执行记录审计日志
 */

import { randomUUID } from 'node:crypto'
import {
  executeInSandbox,
  checkForbiddenPatterns,
  type SandboxExecutionResult,
  type CommandWhitelistEntry,
} from './sandbox-execution'
import type { ToolExecutor } from '@/lib/agent-runtime/turn-loop'

// ─── 类型定义 ──────────────────────────────────────────────────────

export interface SandboxToolExecutorOptions {
  /** 工作目录 */
  cwd?: string
  /** 超时毫秒数（默认 30s） */
  timeoutMs?: number
  /** 最大输出字符数（默认 12KB） */
  maxOutputChars?: number
  /** 自定义白名单（为空则使用默认） */
  whitelist?: CommandWhitelistEntry[]
  /** 自定义环境变量 */
  env?: Record<string, string>
}

export interface SandboxToolExecutionRecord {
  /** 执行 ID */
  id: string
  /** Agent ID */
  agentId: string
  /** 工具名称 */
  toolName: string
  /** 原始命令 */
  command: string
  /** 执行结果 */
  result: SandboxExecutionResult
  /** 执行耗时 */
  durationMs: number
  /** 时间戳 */
  timestamp: string
}

// ─── 审计日志存储 ──────────────────────────────────────────────────

const executionRecords: SandboxToolExecutionRecord[] = []

/**
 * 获取所有执行记录（用于审计查询）
 */
export function getExecutionRecords(): SandboxToolExecutionRecord[] {
  return [...executionRecords]
}

/**
 * 获取指定 Agent 的执行记录
 */
export function getExecutionRecordsByAgent(agentId: string): SandboxToolExecutionRecord[] {
  return executionRecords.filter((r) => r.agentId === agentId)
}

/**
 * 清空执行记录（仅测试用）
 */
export function clearExecutionRecords(): void {
  executionRecords.length = 0
}

// ─── 工具名到命令的映射 ────────────────────────────────────────────

/**
 * 将 LLM 工具调用转换为 shell 命令
 *
 * LLM 可能调用的工具名和对应的沙箱命令：
 * - run_tests → npm test
 * - run_vitest → npx vitest run
 * - run_typecheck → npx tsc --noEmit
 * - run_lint → npm run lint
 * - run_build → npm run build
 * - git_status → git status
 * - git_diff → git diff
 * - git_log → git log
 * - execute_command → 直接使用传入的 command 参数
 */
function resolveCommand(toolName: string, input: Record<string, unknown>): string | null {
  // 直接执行命令的工具
  if (toolName === 'execute_command' || toolName === 'execute_sandbox_command') {
    const cmd = input.command
    if (typeof cmd === 'string' && cmd.trim()) {
      return cmd.trim()
    }
    return null
  }

  // 预定义工具映射
  const commandMap: Record<string, () => string> = {
    run_tests: () => 'npm test',
    run_vitest: () => 'npx vitest run',
    run_jest: () => 'npx jest',
    run_bun_test: () => 'bun test',
    run_typecheck: () => 'npx tsc --noEmit',
    run_lint: () => 'npm run lint',
    run_eslint: () => 'npx eslint .',
    run_biome: () => 'npx biome check .',
    run_build: () => 'npm run build',
    git_status: () => 'git status',
    git_diff: () => 'git diff',
    git_log: () => 'git log --oneline -20',
    git_branch: () => 'git branch',
    git_show: () => {
      const ref = typeof input.ref === 'string' ? input.ref : 'HEAD'
      return `git show ${ref}`
    },
    list_directory: () => {
      const dir = typeof input.path === 'string' ? input.path : '.'
      return `ls ${dir}`
    },
    read_file: () => {
      const path = typeof input.path === 'string' ? input.path : ''
      return path ? `cat ${path}` : 'cat'
    },
    count_lines: () => {
      const path = typeof input.path === 'string' ? input.path : '.'
      return `wc -l ${path}`
    },
    search_content: () => {
      const pattern = typeof input.pattern === 'string' ? input.pattern : ''
      const path = typeof input.path === 'string' ? input.path : '.'
      return pattern ? `grep -r "${pattern}" ${path}` : `grep -r "" ${path}`
    },
    prisma_generate: () => 'npx prisma generate',
    prisma_validate: () => 'npx prisma validate',
    prisma_format: () => 'npx prisma format',
  }

  const resolver = commandMap[toolName]
  if (resolver) {
    return resolver()
  }

  return null
}

// ─── 核心执行器 ────────────────────────────────────────────────────

/**
 * 创建沙箱工具执行器
 *
 * 返回一个 ToolExecutor 函数，可直接传给 runTurnLoop
 *
 * @param agentId 执行 Agent 的 ID（用于审计）
 * @param options 执行选项
 */
export function createSandboxToolExecutor(
  agentId: string,
  options: SandboxToolExecutorOptions = {},
): ToolExecutor {
  const {
    cwd = process.cwd(),
    timeoutMs = 30_000,
    maxOutputChars = 12_000,
    whitelist,
    env = {},
  } = options

  return async (
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<{ output: unknown; success: boolean; error?: string }> => {
    const startTime = Date.now()

    // 解析命令
    const command = resolveCommand(toolName, input)
    if (!command) {
      const record: SandboxToolExecutionRecord = {
        id: randomUUID(),
        agentId,
        toolName,
        command: '(unresolvable)',
        result: {
          status: 'denied',
          stdout: '',
          stderr: `Tool "${toolName}" cannot be resolved to a sandbox command.`,
          exitCode: -1,
          durationMs: 0,
          truncated: false,
          denialReason: `Unknown tool: ${toolName}`,
        },
        durationMs: 0,
        timestamp: new Date().toISOString(),
      }
      executionRecords.push(record)

      return {
        output: { status: 'denied', message: record.result.denialReason },
        success: false,
        error: record.result.denialReason,
      }
    }

    // 检查禁止模式
    const forbidden = checkForbiddenPatterns(command)
    if (forbidden) {
      const record: SandboxToolExecutionRecord = {
        id: randomUUID(),
        agentId,
        toolName,
        command,
        result: {
          status: 'forbidden',
          stdout: '',
          stderr: forbidden,
          exitCode: -1,
          durationMs: 0,
          truncated: false,
          denialReason: forbidden,
        },
        durationMs: 0,
        timestamp: new Date().toISOString(),
      }
      executionRecords.push(record)

      return {
        output: { status: 'forbidden', message: forbidden },
        success: false,
        error: forbidden,
      }
    }

    // 在沙箱内执行
    const result = executeInSandbox(command, {
      cwd,
      timeoutMs,
      maxOutputChars,
      whitelist,
      env,
    })

    const durationMs = Date.now() - startTime

    // 记录审计日志
    const record: SandboxToolExecutionRecord = {
      id: randomUUID(),
      agentId,
      toolName,
      command,
      result,
      durationMs,
      timestamp: new Date().toISOString(),
    }
    executionRecords.push(record)

    // 输出到控制台（开发调试）
    console.log(
      `[SandboxExecutor] ${agentId} executed "${command}" → ${result.status} (${durationMs}ms)`,
    )

    // 返回结果
    if (result.status === 'success') {
      return {
        output: {
          status: 'success',
          stdout: result.stdout,
          exitCode: result.exitCode,
          durationMs: result.durationMs,
          truncated: result.truncated,
          command,
          category: result.matchedEntry?.category,
        },
        success: true,
      }
    }

    // 失败/超时/拒绝
    return {
      output: {
        status: result.status,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        truncated: result.truncated,
        command,
        denialReason: result.denialReason,
      },
      success: false,
      error: result.denialReason || `Command failed with exit code ${result.exitCode}`,
    }
  }
}

// ─── 便捷工具定义（供 LLM 使用） ───────────────────────────────────

/**
 * 沙箱模式下可用的工具定义列表
 *
 * 这些工具会被注入到 LLM 的 tool_use 中
 */
export const SANDBOX_TOOL_DEFINITIONS = [
  {
    name: 'execute_sandbox_command',
    description:
      '在沙箱内执行一个白名单命令。允许的命令类别：test, lint, git-read, file-read, database, build。禁止：git-push, git-commit, file-write, 外部 API。',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: '要执行的命令（必须在白名单中）',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'run_tests',
    description: '运行项目测试（npm test）',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'run_typecheck',
    description: '运行 TypeScript 类型检查（npx tsc --noEmit）',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'run_lint',
    description: '运行代码检查（npm run lint）',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'run_build',
    description: '构建项目（npm run build）',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'git_status',
    description: '查看 Git 状态',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'git_diff',
    description: '查看 Git 差异',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'git_log',
    description: '查看最近 20 条 Git 提交',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'list_directory',
    description: '列出目录内容',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '目录路径（默认当前目录）' },
      },
    },
  },
  {
    name: 'read_file',
    description: '读取文件内容',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文件路径' },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_content',
    description: '搜索文件内容（grep）',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: '搜索模式' },
        path: { type: 'string', description: '搜索路径（默认当前目录）' },
      },
      required: ['pattern'],
    },
  },
]
