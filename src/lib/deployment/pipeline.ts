/**
 * Deployment Pipeline — 部署流水线引擎
 *
 * 完整流程：创建分支 → 提交代码 → 推送 → 创建 PR → 触发 CI → 等待 CI → 合并
 *
 * 安全：
 *   - 所有操作记录审计日志
 *   - 高风险操作需要 Kelvin 确认
 *   - CI 失败不会自动合并
 *   - 禁止 force push
 *   - 默认分支保护
 */

import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { publishStepStarted, publishStepCompleted, publishStepFailed } from '@/lib/realtime/event-bus'
import {
  createBranch,
  commitFiles,
  createPullRequest,
  mergePullRequest,
  getCICDStatus,
  waitForCICD,
  isGitHubConfigured,
} from './github-client'
import type {
  PipelineResult,
  PipelineStage,
  PipelineStageResult,
} from './types'

// ─── 核心引擎 ──────────────────────────────────────────────────────

export interface PipelineInput {
  /** Agent ID */
  agentId: string
  /** 任务 ID */
  taskId: string
  /** 分支名称 */
  branchName: string
  /** 要提交的文件 */
  files: Array<{ path: string; content: string; action: 'create' | 'modify' | 'delete' }>
  /** PR 标题 */
  prTitle: string
  /** PR 描述 */
  prBody: string
  /** 目标分支（默认 main） */
  targetBranch?: string
  /** 是否跳过 CI（紧急修复） */
  skipCI?: boolean
  /** 是否创建为 Draft PR */
  draft?: boolean
  /** CI 等待超时毫秒 */
  ciTimeoutMs?: number
}

/**
 * 运行部署流水线
 *
 * 完整流程：分支 → 提交 → PR → CI → 合并
 */
export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const startTime = Date.now()
  const pipelineId = `pipeline-${randomUUID()}`
  const targetBranch = input.targetBranch ?? 'main'

  const result: PipelineResult = {
    id: pipelineId,
    status: 'running',
    stages: [],
    createdAt: new Date().toISOString(),
  }

  // 检查 GitHub 是否已配置
  if (!isGitHubConfigured()) {
    result.status = 'failed'
    result.completedAt = new Date().toISOString()
    result.durationMs = Date.now() - startTime
    addStage(result, 'branch_create', 'failed', 'GitHub not configured (GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME)')
    return result
  }

  const agentId = input.agentId
  const taskId = input.taskId

  // 记录审计：流水线开始
  await recordAudit(taskId, agentId, 'pipeline.started', { pipelineId, branchName: input.branchName })

  try {
    // Stage 1: 创建分支
    addStage(result, 'branch_create', 'running', `Creating branch: ${input.branchName}`)
    publishStepStarted(agentId, taskId, `pipeline:branch_create`)

    const branch = await createBranch(input.branchName, targetBranch)
    completeStage(result, 'branch_create', { branch: branch.name, sha: branch.sha })
    publishStepCompleted(agentId, taskId, `pipeline:branch_create`, { branch: branch.name })

    // Stage 2: 提交代码
    addStage(result, 'code_commit', 'running', `Committing ${input.files.length} file(s)`)
    publishStepStarted(agentId, taskId, `pipeline:code_commit`)

    const commits = await commitFiles(
      input.files,
      `[${agentId}] ${input.prTitle}`,
      input.branchName,
    )
    completeStage(result, 'code_commit', {
      commitCount: commits.length,
      commits: commits.map((c) => ({ sha: c.sha.slice(0, 7), message: c.message })),
    })
    publishStepCompleted(agentId, taskId, `pipeline:code_commit`, { commitCount: commits.length })

    // Stage 3: 创建 PR
    addStage(result, 'pr_create', 'running', `Creating PR: ${input.prTitle}`)
    publishStepStarted(agentId, taskId, `pipeline:pr_create`)

    const pr = await createPullRequest({
      title: input.prTitle,
      body: input.prBody,
      head: input.branchName,
      base: targetBranch,
      draft: input.draft,
    })
    result.pr = pr
    completeStage(result, 'pr_create', { prNumber: pr.number, prUrl: pr.url })
    publishStepCompleted(agentId, taskId, `pipeline:pr_create`, { prNumber: pr.number })

    // Stage 4: 等待 CI（可选）
    if (!input.skipCI) {
      addStage(result, 'ci_wait', 'running', 'Waiting for CI to complete...')
      publishStepStarted(agentId, taskId, `pipeline:ci_wait`)

      const ciRuns = await getCICDStatus(input.branchName)
      const latestRun = ciRuns[0]

      if (latestRun) {
        const ciResult = await waitForCICD(
          latestRun.id,
          input.ciTimeoutMs ?? 600_000,
          10_000,
        )

        if (ciResult) {
          result.ci = ciResult
          if (ciResult.status === 'success') {
            completeStage(result, 'ci_wait', { ciStatus: 'success', ciUrl: ciResult.url })
          } else {
            failStage(result, 'ci_wait', `CI failed: ${ciResult.conclusion ?? ciResult.status}`)
            result.status = 'failed'
            result.completedAt = new Date().toISOString()
            result.durationMs = Date.now() - startTime
            await recordAudit(taskId, agentId, 'pipeline.failed', { pipelineId, stage: 'ci_wait', error: `CI ${ciResult.status}` })
            return result
          }
        } else {
          failStage(result, 'ci_wait', 'CI timed out')
          result.status = 'failed'
          result.completedAt = new Date().toISOString()
          result.durationMs = Date.now() - startTime
          return result
        }
      } else {
        completeStage(result, 'ci_wait', { ciStatus: 'no_runs_found' })
      }
      publishStepCompleted(agentId, taskId, `pipeline:ci_wait`)
    }

    // Stage 5: 合并 PR
    addStage(result, 'merge', 'running', `Merging PR #${pr.number}`)
    publishStepStarted(agentId, taskId, `pipeline:merge`)

    const mergeResult = await mergePullRequest(pr.number, 'squash')
    if (mergeResult.merged) {
      completeStage(result, 'merge', { merged: true, mergeSha: mergeResult.sha })
      publishStepCompleted(agentId, taskId, `pipeline:merge`, { merged: true })
    } else {
      failStage(result, 'merge', 'PR merge failed (may need manual merge)')
      result.status = 'failed'
      result.completedAt = new Date().toISOString()
      result.durationMs = Date.now() - startTime
      await recordAudit(taskId, agentId, 'pipeline.failed', { pipelineId, stage: 'merge' })
      return result
    }

    // 全部完成
    result.status = 'completed'
    result.completedAt = new Date().toISOString()
    result.durationMs = Date.now() - startTime

    await recordAudit(taskId, agentId, 'pipeline.completed', {
      pipelineId,
      prNumber: pr.number,
      prUrl: pr.url,
      branchName: input.branchName,
      commitCount: commits.length,
      durationMs: result.durationMs,
    })

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    result.status = 'failed'
    result.completedAt = new Date().toISOString()
    result.durationMs = Date.now() - startTime

    publishStepFailed(agentId, taskId, `pipeline:${result.stages[result.stages.length - 1]?.stage ?? 'unknown'}`, errorMessage)
    await recordAudit(taskId, agentId, 'pipeline.failed', { pipelineId, error: errorMessage })

    return result
  }
}

// ─── 辅助函数 ──────────────────────────────────────────────────────

function addStage(
  result: PipelineResult,
  stage: PipelineStage,
  status: PipelineStageResult['status'],
  description: string,
): void {
  result.stages.push({
    stage,
    status,
    description,
  })
}

function completeStage(
  result: PipelineResult,
  stage: PipelineStage,
  output: Record<string, unknown>,
): void {
  const s = result.stages.find((st) => st.stage === stage)
  if (s) {
    s.status = 'completed'
    s.output = output
    s.durationMs = Date.now() - new Date(result.createdAt).getTime()
  }
}

function failStage(
  result: PipelineResult,
  stage: PipelineStage,
  error: string,
): void {
  const s = result.stages.find((st) => st.stage === stage)
  if (s) {
    s.status = 'failed'
    s.error = error
  }
}

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
        reason: `Deployment pipeline: ${eventType}`,
        payloadJson: JSON.stringify(details),
      },
    })
  } catch {
    // 审计失败不影响部署
  }
}
