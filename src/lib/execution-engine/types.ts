// 执行引擎类型定义

export type ExecutionTaskType =
  | 'tool_call'
  | 'file_operation'
  | 'git_operation'
  | 'code_execution'
  | 'api_call'

export type ExecutionTaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'awaiting_approval'

export type ExecutionAction =
  | 'read_file'
  | 'write_file'
  | 'delete_file'
  | 'list_directory'
  | 'search_files'
  | 'git_status'
  | 'git_add'
  | 'git_commit'
  | 'git_push'
  | 'git_pull'
  | 'git_branch'
  | 'git_checkout'
  | 'execute_code'
  | 'call_api'

export interface ExecutionContext {
  taskId: string
  correlationId: string
  agentId: string
  userId: string
  sandboxId?: string
  permissions: string[]
}

export interface ExecutionRequest {
  id: string
  type: ExecutionTaskType
  action: ExecutionAction
  input: Record<string, unknown>
  context: ExecutionContext
  requiresApproval: boolean
  timeoutMs?: number
}

export interface ExecutionResult {
  id: string
  requestId: string
  status: ExecutionTaskStatus
  output: Record<string, unknown>
  error?: string
  durationMs: number
  sideEffects: SideEffect[]
  createdAt: Date
}

export interface SideEffect {
  type: 'file_write' | 'file_delete' | 'git_commit' | 'api_call' | 'code_execution'
  target: string
  description: string
  reversible: boolean
}

export interface ExecutionSnapshot {
  id: string
  taskId: string
  timestamp: Date
  state: Record<string, unknown>
  description: string
}

export interface SandboxConfig {
  allowedRoots: string[]
  blockedPatterns: string[]
  maxExecutionTimeMs: number
  maxRetries: number
  requireApprovalFor: ExecutionAction[]
}

export interface SecurityPolicy {
  allowedDomains: string[]
  blockedPatterns: string[]
  maxExecutionTimeMs: number
  maxRetries: number
  requireApproval: ExecutionAction[]
  auditLog: boolean
}

export interface ExecutionPlan {
  id: string
  taskId: string
  steps: ExecutionStep[]
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: Date
}

export interface ExecutionStep {
  index: number
  action: ExecutionAction
  input: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  result?: ExecutionResult
  error?: string
}
