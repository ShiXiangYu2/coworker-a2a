/**
 * Sandbox execution helper.
 *
 * Runs only whitelisted local commands and blocks obvious destructive patterns.
 */

import { execSync } from 'node:child_process'

export interface CommandWhitelistEntry {
  pattern: string
  category: 'test' | 'lint' | 'git_read' | 'git_write' | 'file_read' | 'database' | 'build'
  riskLevel: 'low' | 'medium'
  description: string
}

export const DEFAULT_COMMAND_WHITELIST: CommandWhitelistEntry[] = [
  { pattern: 'npm test', category: 'test', riskLevel: 'low', description: 'Run project tests' },
  { pattern: 'npx vitest run', category: 'test', riskLevel: 'low', description: 'Run Vitest tests' },
  { pattern: 'npx jest', category: 'test', riskLevel: 'low', description: 'Run Jest tests' },
  { pattern: 'bun test', category: 'test', riskLevel: 'low', description: 'Run Bun tests' },
  { pattern: 'npm run lint', category: 'lint', riskLevel: 'low', description: 'Run lint checks' },
  { pattern: 'npx eslint', category: 'lint', riskLevel: 'low', description: 'Run ESLint' },
  { pattern: 'npx biome check', category: 'lint', riskLevel: 'low', description: 'Run Biome checks' },
  { pattern: 'git status', category: 'git_read', riskLevel: 'low', description: 'View git status' },
  { pattern: 'git diff', category: 'git_read', riskLevel: 'low', description: 'View git diff' },
  { pattern: 'git log', category: 'git_read', riskLevel: 'low', description: 'View git log' },
  { pattern: 'git branch', category: 'git_read', riskLevel: 'low', description: 'View git branches' },
  { pattern: 'git show', category: 'git_read', riskLevel: 'low', description: 'View git show' },
  { pattern: 'git add', category: 'git_write', riskLevel: 'medium', description: 'Stage files for commit' },
  { pattern: 'git commit', category: 'git_write', riskLevel: 'medium', description: 'Create a commit' },
  { pattern: 'ls', category: 'file_read', riskLevel: 'low', description: 'List directory contents' },
  { pattern: 'cat', category: 'file_read', riskLevel: 'low', description: 'View file contents' },
  { pattern: 'head', category: 'file_read', riskLevel: 'low', description: 'View file head' },
  { pattern: 'tail', category: 'file_read', riskLevel: 'low', description: 'View file tail' },
  { pattern: 'find', category: 'file_read', riskLevel: 'low', description: 'Find files' },
  { pattern: 'wc', category: 'file_read', riskLevel: 'low', description: 'Count file lines' },
  { pattern: 'grep', category: 'file_read', riskLevel: 'low', description: 'Search file contents' },
  { pattern: 'npx prisma db push', category: 'database', riskLevel: 'medium', description: 'Sync database schema' },
  { pattern: 'npx prisma generate', category: 'database', riskLevel: 'low', description: 'Generate Prisma Client' },
  { pattern: 'npx prisma validate', category: 'database', riskLevel: 'low', description: 'Validate Prisma schema' },
  { pattern: 'npx prisma format', category: 'database', riskLevel: 'low', description: 'Format Prisma schema' },
  { pattern: 'npm run build', category: 'build', riskLevel: 'medium', description: 'Build project' },
  { pattern: 'npx tsc --noEmit', category: 'build', riskLevel: 'low', description: 'Run TypeScript typecheck' },
]

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\brm\s+(-[rf]+\s+|--force|--recursive)/,
  /\bgit\s+push/,
  /\bgit\s+merge/,
  /\bgit\s+checkout/,
  /\bgit\s+reset\s+--hard/,
  /\bgit\s+branch\s+-[dD]/,
  /\bgit\s+commit\s+.*--force/,
  /\bcurl\s+.*https?:\/\//,
  /\bwget\s+.*https?:\/\//,
  /\b(sudo|su)\s/,
  /\bchmod\s+/,
  /\bkill\s+/,
  /\bkillall\s/,
  /\bshutdown\s/,
  /\breboot\s/,
  /\bdd\s+if=/,
  /\bmkfs\./,
  /\bdocker\s+(run|exec|rm|stop|kill)/,
  /\bkubectl\s+(delete|exec)/,
]

export interface SandboxExecutionResult {
  status: 'success' | 'failed' | 'timeout' | 'denied' | 'forbidden'
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
  truncated: boolean
  denialReason?: string
  matchedEntry?: CommandWhitelistEntry
}

export interface SandboxExecutionOptions {
  cwd?: string
  timeoutMs?: number
  maxOutputChars?: number
  env?: Record<string, string>
  whitelist?: CommandWhitelistEntry[]
}

export function matchCommandWhitelist(
  command: string,
  whitelist: CommandWhitelistEntry[] = DEFAULT_COMMAND_WHITELIST
): CommandWhitelistEntry | null {
  const trimmed = command.trim()
  for (const entry of whitelist) {
    if (trimmed.startsWith(entry.pattern)) return entry
  }
  return null
}

export function checkForbiddenPatterns(command: string): string | null {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(command)) {
      return `Command matches forbidden pattern: ${pattern.source}`
    }
  }
  return null
}

function truncateOutput(output: string, maxChars: number): { text: string; truncated: boolean } {
  if (output.length <= maxChars) return { text: output, truncated: false }
  return {
    text: `${output.slice(0, maxChars)}\n\n[... output truncated, original length ${output.length} chars, limit ${maxChars} chars]`,
    truncated: true,
  }
}

function bufferToText(value: Buffer | string | undefined | null): string {
  if (!value) return ''
  return Buffer.isBuffer(value) ? value.toString('utf-8') : String(value)
}

export function executeInSandbox(
  command: string,
  options: SandboxExecutionOptions = {}
): SandboxExecutionResult {
  const {
    cwd = process.cwd(),
    timeoutMs = 30_000,
    maxOutputChars = 12_000,
    env = {},
    whitelist = DEFAULT_COMMAND_WHITELIST,
  } = options

  const forbidden = checkForbiddenPatterns(command)
  if (forbidden) {
    return {
      status: 'forbidden',
      stdout: '',
      stderr: forbidden,
      exitCode: -1,
      durationMs: 0,
      truncated: false,
      denialReason: forbidden,
    }
  }

  const matchedEntry = matchCommandWhitelist(command, whitelist)
  if (!matchedEntry) {
    return {
      status: 'denied',
      stdout: '',
      stderr: `Command not in whitelist: "${command.split(' ')[0]}". Only pre-approved commands are allowed.`,
      exitCode: -1,
      durationMs: 0,
      truncated: false,
      denialReason: `Command "${command.split(' ')[0]}" is not in the whitelist. Allowed categories: test, lint, git_read, git_write, file_read, database, build.`,
      matchedEntry: undefined,
    }
  }

  const startTime = Date.now()
  try {
    const stdoutBuffer = execSync(command, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: maxOutputChars * 2,
      env: { ...process.env, ...env },
      encoding: 'buffer',
      shell: process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : '/bin/sh',
    })

    const durationMs = Date.now() - startTime
    const stdout = bufferToText(stdoutBuffer)
    const truncStdout = truncateOutput(stdout, maxOutputChars)

    return {
      status: 'success',
      stdout: truncStdout.text,
      stderr: '',
      exitCode: 0,
      durationMs,
      truncated: truncStdout.truncated,
      matchedEntry,
    }
  } catch (error: unknown) {
    const err = error as {
      status?: number
      stdout?: Buffer | string
      stderr?: Buffer | string
      killed?: boolean
      signal?: string
      message?: string
    }

    const durationMs = Date.now() - startTime
    const stdout = bufferToText(err.stdout)
    const stderr = bufferToText(err.stderr)
    const truncStdout = truncateOutput(stdout, maxOutputChars)
    const truncStderr = truncateOutput(stderr, maxOutputChars)

    if (err.killed || err.signal === 'SIGTERM') {
      return {
        status: 'timeout',
        stdout: truncStdout.text,
        stderr: `${truncStderr.text}\n\n[Command timed out after ${timeoutMs}ms]`,
        exitCode: err.status ?? -1,
        durationMs,
        truncated: truncStdout.truncated || truncStderr.truncated,
        denialReason: `Command exceeded timeout of ${timeoutMs}ms`,
        matchedEntry,
      }
    }

    return {
      status: 'failed',
      stdout: truncStdout.text,
      stderr: `${truncStderr.text}${err.message ? `\n\nError: ${err.message}` : ''}`,
      exitCode: err.status ?? 1,
      durationMs,
      truncated: truncStdout.truncated || truncStderr.truncated,
      matchedEntry,
    }
  }
}
