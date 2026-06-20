/**
 * Deployment Types — 部署流水线类型定义
 */

// ─── Git 操作 ──────────────────────────────────────────────────────

export interface GitBranch {
  name: string
  sha: string
  createdAt: string
}

export interface GitCommit {
  sha: string
  message: string
  author: string
  date: string
  filesChanged: string[]
}

// ─── PR 操作 ───────────────────────────────────────────────────────

export type PRStatus = 'open' | 'closed' | 'merged' | 'draft'

export interface PullRequest {
  number: number
  title: string
  body: string
  head: string
  base: string
  status: PRStatus
  url: string
  createdAt: string
  updatedAt: string
  mergedAt?: string
  mergeCommitSha?: string
}

export interface CreatePRInput {
  title: string
  body: string
  head: string
  base: string
  draft?: boolean
}

// ─── CI/CD 操作 ────────────────────────────────────────────────────

export type CICDStatus = 'queued' | 'in_progress' | 'success' | 'failure' | 'cancelled' | 'pending'

export interface CICDRun {
  id: number
  name: string
  status: CICDStatus
  conclusion?: string
  url: string
  headSha: string
  startedAt?: string
  completedAt?: string
  jobs?: CICDJob[]
}

export interface CICDJob {
  id: number
  name: string
  status: CICDStatus
  conclusion?: string
  steps?: CICDStep[]
}

export interface CICDStep {
  name: string
  status: CICDStatus
  conclusion?: string
  number: number
}

// ─── 部署操作 ──────────────────────────────────────────────────────

export type DeployTarget = 'staging' | 'production'

export interface DeployResult {
  success: boolean
  target: DeployTarget
  version?: string
  url?: string
  error?: string
  durationMs: number
}

// ─── 流水线阶段 ────────────────────────────────────────────────────

export type PipelineStage =
  | 'branch_create'
  | 'code_commit'
  | 'push'
  | 'pr_create'
  | 'ci_trigger'
  | 'ci_wait'
  | 'review'
  | 'merge'
  | 'deploy_staging'
  | 'deploy_production'

export type PipelineStageStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'

export interface PipelineStageResult {
  stage: PipelineStage
  status: PipelineStageStatus
  /** 阶段描述 */
  description: string
  /** 耗时毫秒 */
  durationMs?: number
  /** 输出信息 */
  output?: Record<string, unknown>
  /** 错误信息 */
  error?: string
}

export interface PipelineResult {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  stages: PipelineStageResult[]
  /** PR 信息（如果创建了 PR） */
  pr?: PullRequest
  /** CI 信息（如果触发了 CI） */
  ci?: CICDRun
  /** 部署信息 */
  deploy?: DeployResult
  /** 总耗时毫秒 */
  durationMs?: number
  /** 创建时间 */
  createdAt: string
  /** 完成时间 */
  completedAt?: string
}
