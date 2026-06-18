/**
 * Sprint 19: Tool 执行器
 *
 * 在沙箱中执行工具调用，支持：
 * - 命令执行（白名单）
 * - 文件写入（安全目录）
 * - 超时控制
 * - 输出截断
 */

import { execSync } from 'node:child_process'
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/** 工具执行结果 */
export interface ToolExecutionResult {
  success: boolean
  output: string
  error?: string
  durationMs: number
}

/** 白名单命令（安全执行） */
const ALLOWED_COMMANDS = [
  'echo',
  'date',
  'pwd',
  'ls',
  'cat',
  'head',
  'tail',
  'wc',
  'grep',
  'find',
  'git status',
  'git log',
  'git diff',
  'node -e',
]

/** 禁止的危险模式 */
const FORBIDDEN_PATTERNS = [
  /rm\s+-rf/i,
  /del\s+/i,
  /format\s+/i,
  /mkfs/i,
  /dd\s+/i,
  />\s*\/dev\/sd/i,
  /chmod\s+777/i,
  /curl.*\|\s*sh/i,
  /wget.*\|\s*sh/i,
]

/** 安全目录（只允许写入此目录下） */
const SAFE_WRITE_DIR = join(process.cwd(), 'deliverables')

/** 最大输出长度 */
const MAX_OUTPUT_LENGTH = 10000

/** 默认超时（毫秒） */
const DEFAULT_TIMEOUT_MS = 30000

/**
 * 执行工具调用
 */
export async function executeToolCall(
  toolName: string,
  input: Record<string, unknown>
): Promise<ToolExecutionResult> {
  const startTime = Date.now()

  switch (toolName) {
    case 'execute_command':
      return executeCommand(input, startTime)
    case 'write_file':
      return writeFile(input, startTime)
    case 'read_file':
      return readFile(input, startTime)
    default:
      return {
        success: false,
        output: '',
        error: `Unknown tool: ${toolName}`,
        durationMs: Date.now() - startTime,
      }
  }
}

/**
 * 执行命令（白名单检查）
 */
function executeCommand(
  input: Record<string, unknown>,
  startTime: number
): ToolExecutionResult {
  const command = String(input.command ?? '')

  if (!command) {
    return {
      success: false,
      output: '',
      error: 'command is required',
      durationMs: Date.now() - startTime,
    }
  }

  // 检查禁止模式
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(command)) {
      return {
        success: false,
        output: '',
        error: `Command blocked: matches forbidden pattern`,
        durationMs: Date.now() - startTime,
      }
    }
  }

  // 检查白名单
  const isAllowed = ALLOWED_COMMANDS.some((cmd) => command.startsWith(cmd))
  if (!isAllowed) {
    return {
      success: false,
      output: '',
      error: `Command not in whitelist: ${command.split(' ')[0]}. Allowed: ${ALLOWED_COMMANDS.join(', ')}`,
      durationMs: Date.now() - startTime,
    }
  }

  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      timeout: DEFAULT_TIMEOUT_MS,
      maxBuffer: 1024 * 1024, // 1MB
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const truncated = output.length > MAX_OUTPUT_LENGTH
      ? output.slice(0, MAX_OUTPUT_LENGTH) + '\n... (truncated)'
      : output

    return {
      success: true,
      output: truncated,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string }
    return {
      success: false,
      output: err.stdout ?? '',
      error: err.stderr ?? err.message ?? 'Command execution failed',
      durationMs: Date.now() - startTime,
    }
  }
}

/**
 * 写入文件（安全目录）
 */
function writeFile(
  input: Record<string, unknown>,
  startTime: number
): ToolExecutionResult {
  const filename = String(input.filename ?? '')
  const content = String(input.content ?? '')

  if (!filename || !content) {
    return {
      success: false,
      output: '',
      error: 'filename and content are required',
      durationMs: Date.now() - startTime,
    }
  }

  // 安全检查：不允许路径遍历
  if (filename.includes('..') || filename.startsWith('/')) {
    return {
      success: false,
      output: '',
      error: 'Filename cannot contain .. or start with /',
      durationMs: Date.now() - startTime,
    }
  }

  try {
    // 确保目录存在
    if (!existsSync(SAFE_WRITE_DIR)) {
      mkdirSync(SAFE_WRITE_DIR, { recursive: true })
    }

    const filePath = join(SAFE_WRITE_DIR, filename)
    writeFileSync(filePath, content, 'utf-8')

    return {
      success: true,
      output: `File written: ${filePath}`,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `Failed to write file: ${error instanceof Error ? error.message : 'unknown'}`,
      durationMs: Date.now() - startTime,
    }
  }
}

/**
 * 读取文件（安全目录）
 */
function readFile(
  input: Record<string, unknown>,
  startTime: number
): ToolExecutionResult {
  const filename = String(input.filename ?? '')

  if (!filename) {
    return {
      success: false,
      output: '',
      error: 'filename is required',
      durationMs: Date.now() - startTime,
    }
  }

  // 安全检查
  if (filename.includes('..') || filename.startsWith('/')) {
    return {
      success: false,
      output: '',
      error: 'Filename cannot contain .. or start with /',
      durationMs: Date.now() - startTime,
    }
  }

  try {
    const filePath = join(SAFE_WRITE_DIR, filename)

    if (!existsSync(filePath)) {
      return {
        success: false,
        output: '',
        error: `File not found: ${filename}`,
        durationMs: Date.now() - startTime,
      }
    }

    const content = readFileSync(filePath, 'utf-8')
    const truncated = content.length > MAX_OUTPUT_LENGTH
      ? content.slice(0, MAX_OUTPUT_LENGTH) + '\n... (truncated)'
      : content

    return {
      success: true,
      output: truncated,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `Failed to read file: ${error instanceof Error ? error.message : 'unknown'}`,
      durationMs: Date.now() - startTime,
    }
  }
}
