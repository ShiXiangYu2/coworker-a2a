/**
 * Execution Closure Types — 运行时执行闭环类型定义
 *
 * 定义 Agent 从代码修改到验证提交的完整执行流程。
 */

// ─── 执行步骤 ──────────────────────────────────────────────────────

export type ExecutionStepType =
  | 'file_write'
  | 'typecheck'
  | 'lint'
  | 'test'
  | 'git_add'
  | 'git_commit'
  | 'git_push'

export type ExecutionStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'

export interface ExecutionStep {
  id: string
  type: ExecutionStepType
  status: ExecutionStepStatus
  /** 步骤描述 */
  description: string
  /** 输入摘要 */
  inputSummary: string
  /** 输出摘要 */
  outputSummary?: string
  /** 错误信息 */
  error?: string
  /** 耗时毫秒 */
  durationMs?: number
  /** 退出码（命令执行类步骤） */
  exitCode?: number
  /** stdout 摘要 */
  stdout?: string
  /** stderr 摘要 */
  stderr?: string
}

// ─── 执行计划 ──────────────────────────────────────────────────────

export type ExecutionPlanStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface ExecutionPlan {
  id: string
  status: ExecutionPlanStatus
  /** Agent ID */
  agentId: string
  /** 任务 ID */
  taskId: string
  /** 执行步骤列表 */
  steps: ExecutionStep[]
  /** 当前步骤索引 */
  currentStepIndex: number
  /** 整体描述 */
  description: string
  /** 是否需要人工确认 */
  requiresHumanConfirmation: boolean
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 完成时间 */
  completedAt?: string
}

// ─── 文件变更 ──────────────────────────────────────────────────────

export interface FileChange {
  /** 文件路径（相对于项目根目录） */
  path: string
  /** 变更类型 */
  action: 'create' | 'modify' | 'delete'
  /** 新内容（create/modify 时） */
  content?: string
  /** 变更原因 */
  reason: string
}

// ─── 执行结果 ──────────────────────────────────────────────────────

export interface ExecutionClosureResult {
  /** 是否全部成功 */
  success: boolean
  /** 执行计划 */
  plan: ExecutionPlan
  /** 验证结果 */
  validation: {
    typecheck: boolean
    lint: boolean
    test: boolean
  }
  /** Git 操作结果 */
  git?: {
    branchName?: string
    commitHash?: string
    committedFiles: string[]
  }
  /** 总耗时毫秒 */
  durationMs: number
  /** 错误信息（如果失败） */
  error?: string
}
