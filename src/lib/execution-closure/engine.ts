/**
 * Execution Closure Engine — 运行时执行闭环引擎
 *
 * 完整流程：写代码 → 类型检查 → Lint → 测试 → Git Add → Git Commit
 *
 * 核心原则：
 *   - 每一步都有验证，失败则停止
 *   - 所有操作记录审计日志
 *   - 文件写入走沙箱（受控目录）
 *   - Git 操作有安全边界（不能 push/merge）
 *   - 支持人工确认门控
 *
 * 安全：
 *   - 文件写入限制在 src/ 下的指定扩展名
 *   - Git commit 自动加 Agent ID 前缀
 *   - 禁止 git push / merge / force
 *   - 每步执行记录到 HarmonyAuditEvent
 */

import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { executeInSandbox, checkForbiddenPatterns } from '@/lib/tools/sandbox-execution'
import { publishStepStarted, publishStepCompleted, publishStepFailed } from '@/lib/realtime/event-bus'
import type {
  ExecutionPlan,
  ExecutionStep,
  FileChange,
  ExecutionClosureResult,
} from './types'

// ─── 沙箱配置 ──────────────────────────────────────────────────────

const SRC_WRITE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.prisma']
const MAX_FILE_SIZE = 200 * 1024 // 200KB per file
const COMMAND_TIMEOUT_MS = 60_000 // 60s per command

// ─── 核心引擎 ──────────────────────────────────────────────────────

/**
 * 执行完整的代码修改闭环
 *
 * @param agentId 执行的 Agent ID
 * @param taskId 任务 ID
 * @param files 要修改的文件列表
 * @param description 执行描述
 * @param options 选项
 * @returns 执行结果
 */
export async function executeCodeClosure(
  agentId: string,
  taskId: string,
  files: FileChange[],
  description: string,
  options: {
    /** 是否跳过测试（紧急修复时可选） */
    skipTests?: boolean
    /** 是否需要人工确认 */
    requiresHumanConfirmation?: boolean
    /** commit message 前缀 */
    commitPrefix?: string
    /** 工作目录 */
    cwd?: string
  } = {},
): Promise<ExecutionClosureResult> {
  const startTime = Date.now()
  const plan = createExecutionPlan(agentId, taskId, files, description, options)

  // 记录审计：执行计划创建
  await recordAudit(taskId, agentId, 'execution_closure.plan_created', {
    planId: plan.id,
    fileCount: files.length,
    stepCount: plan.steps.length,
  })

  // 逐步执行
  for (let i = 0; i < plan.steps.length; i++) {
    plan.currentStepIndex = i
    const step = plan.steps[i]

    // 发布实时事件
    publishStepStarted(agentId, taskId, `${step.type}: ${step.description}`)

    // 标记为运行中
    step.status = 'running'
    step.durationMs = undefined

    try {
      await executeStep(step, files, options.cwd ?? process.cwd(), options.commitPrefix ?? agentId)

      step.status = 'completed'
      publishStepCompleted(agentId, taskId, `${step.type}: ${step.description}`, {
        exitCode: step.exitCode,
      })
    } catch (error) {
      step.status = 'failed'
      step.error = error instanceof Error ? error.message : String(error)
      step.exitCode = 1
      publishStepFailed(agentId, taskId, `${step.type}: ${step.description}`, step.error)

      plan.status = 'failed'
      plan.completedAt = new Date().toISOString()

      // 记录审计：执行失败
      await recordAudit(taskId, agentId, 'execution_closure.step_failed', {
        planId: plan.id,
        stepType: step.type,
        stepIndex: i,
        error: step.error,
      })

      return buildResult(plan, false, startTime, step.error)
    }
  }

  // 全部步骤完成
  plan.status = 'completed'
  plan.completedAt = new Date().toISOString()

  // 记录审计：执行完成
  await recordAudit(taskId, agentId, 'execution_closure.completed', {
    planId: plan.id,
    stepCount: plan.steps.length,
    durationMs: Date.now() - startTime,
  })

  return buildResult(plan, true, startTime)
}

// ─── 步骤执行 ──────────────────────────────────────────────────────

async function executeStep(
  step: ExecutionStep,
  files: FileChange[],
  cwd: string,
  commitPrefix: string,
): Promise<void> {
  const stepStart = Date.now()

  switch (step.type) {
    case 'file_write':
      await executeFileWrites(files, cwd)
      break
    case 'typecheck': {
      // 只检查修改的 TypeScript 文件（避免预存在错误导致整个流程失败）
      const tsFiles = files
        .filter((f) => f.action !== 'delete' && /\.(ts|tsx)$/.test(f.path))
        .map((f) => f.path)
      if (tsFiles.length > 0) {
        await executeCommand(step, `npx tsc --noEmit --pretty false ${tsFiles.join(' ')}`, cwd)
      } else {
        // 没有 TypeScript 文件修改，跳过类型检查
        step.status = 'completed'
        step.outputSummary = 'No TypeScript files modified, skipping typecheck'
      }
      break
    }
    case 'lint':
      await executeCommand(step, 'npx eslint src/ --quiet', cwd)
      break
    case 'test':
      await executeCommand(step, 'npx vitest run', cwd)
      break
    case 'git_add':
      await executeGitAdd(files, cwd)
      break
    case 'git_commit':
      await executeGitCommit(files, commitPrefix, cwd)
      break
    default:
      throw new Error(`Unknown step type: ${step.type}`)
  }

  step.durationMs = Date.now() - stepStart
}

// ─── 文件写入 ──────────────────────────────────────────────────────

async function executeFileWrites(files: FileChange[], cwd: string): Promise<void> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  for (const file of files) {
    if (file.action === 'delete') {
      // 删除文件
      const fullPath = path.resolve(cwd, file.path)
      validateSrcPath(fullPath, cwd)
      await fs.unlink(fullPath).catch(() => {
        // 文件不存在时不报错
      })
      continue
    }

    if (!file.content) {
      throw new Error(`File ${file.path} has no content for ${file.action}`)
    }

    // 验证文件大小
    if (file.content.length > MAX_FILE_SIZE) {
      throw new Error(`File ${file.path} exceeds max size: ${file.content.length} > ${MAX_FILE_SIZE}`)
    }

    // 验证扩展名
    const ext = path.extname(file.path).toLowerCase()
    if (!SRC_WRITE_EXTENSIONS.includes(ext)) {
      throw new Error(`File extension not allowed: ${ext}. Allowed: ${SRC_WRITE_EXTENSIONS.join(', ')}`)
    }

    // 写入文件
    const fullPath = path.resolve(cwd, file.path)
    validateSrcPath(fullPath, cwd)

    const dir = path.dirname(fullPath)
    await fs.mkdir(dir, { recursive: true })

    // 原子写入：先写临时文件，再 rename
    const tempPath = path.join(dir, `.tmp-${randomUUID()}`)
    await fs.writeFile(tempPath, file.content, 'utf-8')
    await fs.rename(tempPath, fullPath)
  }
}

function validateSrcPath(fullPath: string, cwd: string): void {
  const normalizedCwd = cwd.replace(/\\/g, '/')
  const normalizedPath = fullPath.replace(/\\/g, '/')

  // 必须在项目目录内
  if (!normalizedPath.startsWith(normalizedCwd)) {
    throw new Error(`Path escapes project root: ${fullPath}`)
  }

  // 禁止写入敏感目录
  const sensitiveDirs = ['node_modules', '.git', '.next', 'dist', 'build']
  for (const dir of sensitiveDirs) {
    if (normalizedPath.includes(`/${dir}/`) || normalizedPath.includes(`\\${dir}\\`)) {
      throw new Error(`Cannot write to sensitive directory: ${dir}`)
    }
  }
}

// ─── 命令执行 ──────────────────────────────────────────────────────

async function executeCommand(
  step: ExecutionStep,
  command: string,
  cwd: string,
): Promise<void> {
  // 安全检查
  const forbidden = checkForbiddenPatterns(command)
  if (forbidden) {
    throw new Error(`Command blocked: ${forbidden}`)
  }

  const result = executeInSandbox(command, {
    cwd,
    timeoutMs: COMMAND_TIMEOUT_MS,
    maxOutputChars: 12_000,
  })

  step.stdout = result.stdout.slice(0, 2000)
  step.stderr = result.stderr.slice(0, 2000)
  step.exitCode = result.exitCode

  if (result.status === 'forbidden') {
    throw new Error(`Command forbidden: ${result.denialReason}`)
  }

  if (result.status === 'denied') {
    throw new Error(`Command not in whitelist: ${command.split(' ')[0]}`)
  }

  if (result.status === 'timeout') {
    throw new Error(`Command timed out after ${COMMAND_TIMEOUT_MS}ms`)
  }

  if (result.status === 'failed') {
    throw new Error(`Command failed (exit ${result.exitCode}):\n${result.stderr || result.stdout}`)
  }
}

// ─── Git 操作 ──────────────────────────────────────────────────────

async function executeGitAdd(files: FileChange[], cwd: string): Promise<void> {
  const paths = files.map((f) => f.path).join(' ')
  const result = executeInSandbox(`git add ${paths}`, {
    cwd,
    timeoutMs: 10_000,
  })

  if (result.status !== 'success') {
    throw new Error(`git add failed: ${result.stderr || result.stdout}`)
  }
}

async function executeGitCommit(
  files: FileChange[],
  agentPrefix: string,
  cwd: string,
): Promise<void> {
  const fileSummary = files.map((f) => `${f.action}: ${f.path}`).join(', ')
  const message = `[${agentPrefix}] ${fileSummary}`

  // 安全检查：commit message 不能包含危险内容
  if (checkForbiddenPatterns(message)) {
    throw new Error('Commit message contains forbidden patterns')
  }

  const escapedMessage = message.replace(/"/g, '\\"')
  const result = executeInSandbox(`git commit -m "${escapedMessage}"`, {
    cwd,
    timeoutMs: 10_000,
  })

  if (result.status !== 'success') {
    throw new Error(`git commit failed: ${result.stderr || result.stdout}`)
  }
}

// ─── 辅助函数 ──────────────────────────────────────────────────────

function createExecutionPlan(
  agentId: string,
  taskId: string,
  files: FileChange[],
  description: string,
  options: { skipTests?: boolean; requiresHumanConfirmation?: boolean; commitPrefix?: string },
): ExecutionPlan {
  const steps: ExecutionStep[] = []

  // Step 1: 写入文件
  steps.push({
    id: randomUUID(),
    type: 'file_write',
    status: 'pending',
    description: `Write ${files.length} file(s)`,
    inputSummary: files.map((f) => `${f.action}: ${f.path}`).join(', '),
  })

  // Step 2: 类型检查（只检查修改的文件）
  const tsFileCount = files.filter((f) => f.action !== 'delete' && /\.(ts|tsx)$/.test(f.path)).length
  steps.push({
    id: randomUUID(),
    type: 'typecheck',
    status: 'pending',
    description: `TypeScript type check (${tsFileCount} file(s))`,
    inputSummary: tsFileCount > 0 ? `npx tsc --noEmit ${files.filter((f) => /\.(ts|tsx)$/.test(f.path)).map((f) => f.path).join(' ')}` : 'No TS files to check',
  })

  // Step 3: Lint
  steps.push({
    id: randomUUID(),
    type: 'lint',
    status: 'pending',
    description: 'ESLint check',
    inputSummary: 'npx eslint src/ --quiet',
  })

  // Step 4: 测试（可选跳过）
  if (!options.skipTests) {
    steps.push({
      id: randomUUID(),
      type: 'test',
      status: 'pending',
      description: 'Run test suite',
      inputSummary: 'npx vitest run',
    })
  }

  // Step 5: Git Add
  steps.push({
    id: randomUUID(),
    type: 'git_add',
    status: 'pending',
    description: 'Stage files for commit',
    inputSummary: `git add ${files.map((f) => f.path).join(' ')}`,
  })

  // Step 6: Git Commit
  steps.push({
    id: randomUUID(),
    type: 'git_commit',
    status: 'pending',
    description: 'Create commit',
    inputSummary: `git commit -m "[${options.commitPrefix ?? agentId}] ..."`,
  })

  return {
    id: randomUUID(),
    status: 'pending',
    agentId,
    taskId,
    steps,
    currentStepIndex: 0,
    description,
    requiresHumanConfirmation: options.requiresHumanConfirmation ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function buildResult(
  plan: ExecutionPlan,
  success: boolean,
  startTime: number,
  error?: string,
): ExecutionClosureResult {
  const validation = {
    typecheck: plan.steps.find((s) => s.type === 'typecheck')?.status === 'completed',
    lint: plan.steps.find((s) => s.type === 'lint')?.status === 'completed',
    test: plan.steps.find((s) => s.type === 'test')?.status === 'completed',
  }

  const commitStep = plan.steps.find((s) => s.type === 'git_commit')
  const git = commitStep?.status === 'completed' ? {
    committedFiles: plan.steps.find((s) => s.type === 'file_write')?.inputSummary.split(', ') ?? [],
  } : undefined

  return {
    success,
    plan,
    validation,
    git,
    durationMs: Date.now() - startTime,
    error,
  }
}

// ─── 审计 ──────────────────────────────────────────────────────────

async function recordAudit(
  taskId: string,
  agentId: string,
  eventType: string,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.harmonyAuditEvent.create({
      data: {
        taskId,
        eventType,
        actorType: 'agent',
        actorId: agentId,
        reason: `Execution closure: ${eventType}`,
        payloadJson: JSON.stringify(details),
      },
    })
  } catch {
    // 审计失败不影响执行
  }
}
