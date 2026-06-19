import type { AgentId, RouteSideEffects } from '@/lib/agents/types'
import type { ToolCallCandidate } from '@/lib/tools/types'

/**
 * Agent 运行时模式
 *
 * - analysis_only: Sprint 1-22，Agent 只产出结构化分析，不执行任何工具
 * - sandbox_execution: Sprint 23+，Agent 可在沙箱内执行白名单命令
 *   （测试、lint、类型检查、git 只读操作等）
 */
export type AgentRuntimeMode = 'analysis_only' | 'sandbox_execution'
export type AgentRunStatus =
  | 'created'
  | 'running'
  | 'completed'
  | 'blocked'
  | 'failed'
  | 'cancelled'

export type AgentRunEvent =
  | 'CREATE_FROM_TASK'
  | 'START_ANALYSIS'
  | 'COMPLETE_WITH_RESULT'
  | 'REQUIRE_CONFIRMATION'
  | 'BLOCK'
  | 'FAIL'
  | 'CANCEL'

export type AgentRunTrigger = 'manual' | 'task_ui' | 'api'

export type AgentStepKind =
  | 'load_task_context'
  | 'build_agent_prompt'
  | 'llm_analysis'
  | 'validate_agent_result'
  | 'write_task_step'
  | 'write_audit_event'

export type AgentStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'blocked'
  | 'failed'
  | 'skipped'

export type AgentResultStatus =
  | 'completed'
  | 'blocked'
  | 'needs_human_confirmation'
  | 'failed'

export type AgentResultProposedChangeType =
  | 'requirement'
  | 'design'
  | 'test'
  | 'customer_insight'
  | 'coordination'
  | 'other'

export type AgentResultNextAction =
  | 'show_result'
  | 'ask_human_confirmation'
  | 'request_more_context'
  | 'handoff_to_agent'
  | 'stop'

export interface AgentRuntime {
  id: string
  name: 'controlled_agent_runtime'
  version: string
  mode: AgentRuntimeMode
  enabledAgentIds: Exclude<AgentId, 'kelvin'>[]
  forbiddenActions: string[]
  createdAt: string
}

export interface AgentResult {
  status: AgentResultStatus
  confidence: number
  summary: string
  findings: string[]
  proposedChanges: {
    type: AgentResultProposedChangeType
    title: string
    description: string
    riskLevel: 'low' | 'medium' | 'high'
  }[]
  next: {
    recommendedAction: AgentResultNextAction
    reason: string
    suggestedNextAgentId?: AgentId
  }
  sideEffects: RouteSideEffects
  needsHumanConfirmation: boolean
  safetyNotes: string[]
  memoryCandidates?: {
    title: string
    content: string
    kind:
      | 'project_decision'
      | 'agent_finding'
      | 'user_preference'
      | 'safety_rule'
      | 'workflow_note'
      | 'technical_context'
      | 'other'
    scope: 'global' | 'project' | 'task' | 'agent'
    confidence: number
    tags: string[]
    requiresHumanReview: boolean
  }[]
  a2aDraftCandidates?: {
    toAgentId: AgentId
    intent:
      | 'handoff'
      | 'request_review'
      | 'request_clarification'
      | 'share_finding'
      | 'propose_next_step'
      | 'escalate_to_kelvin'
    subject: string
    body: string
    requiresHumanConfirmation: boolean
  }[]
  toolCallCandidates?: ToolCallCandidate[]
  /** 本次执行看到的上下文快照（来自其他 Agent 的历史输出） */
  contextSnapshot?: {
    completedResults: number
    a2aMessages: number
    memoryEntries: number
    totalLength: number
  }
}

export interface AgentRun {
  id: string
  correlationId?: string
  taskId: string
  taskRunId?: string
  taskStepId?: string
  contextPacketId?: string
  agentId: AgentId
  status: AgentRunStatus
  trigger: AgentRunTrigger
  runtimeMode: AgentRuntimeMode
  attempt: number
  idempotencyKey?: string
  inputSnapshot: unknown
  result?: AgentResult
  error?: {
    code: string
    message: string
  }
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface AgentStep {
  id: string
  agentRunId: string
  taskId: string
  agentId: AgentId
  index: number
  kind: AgentStepKind
  status: AgentStepStatus
  summary: string
  input?: unknown
  output?: unknown
  createdAt: string
  updatedAt: string
}

export interface AgentRunBundle {
  agentRun: AgentRun
  agentSteps: AgentStep[]
}

export interface StartAgentRunInput {
  taskId: string
  idempotencyKey?: string
  trigger: AgentRunTrigger
}

export const agentRuntimeConfig: AgentRuntime = {
  id: 'controlled_agent_runtime',
  name: 'controlled_agent_runtime',
  version: 'sprint-23',
  mode: 'sandbox_execution',
  enabledAgentIds: ['elon', 'jobs', 'linus', 'turing', 'bezos'],
  forbiddenActions: [
    'write-file',
    'edit-file',
    'delete-file',
    'create-branch',
    'git-add',
    'git-commit',
    'git-push',
    'create-pr',
    'merge-pr',
    'deploy',
    'publish',
    'release',
    'send-email',
    'send-message',
    'call-external-api',
    'write-memory',
    'run-a2a-autonomous-loop',
  ],
  createdAt: '2026-06-15T00:00:00.000Z',
}

/**
 * 运行时安全说明（根据模式动态生成）
 */
export function getAgentRuntimeSafetyNote(mode: AgentRuntimeMode): string {
  if (mode === 'sandbox_execution') {
    return 'Sprint 23 sandbox_execution mode: Agents can execute whitelisted commands (test, lint, typecheck, git-read) in a sandboxed environment. Shell, git-write, file-write, PRs, deploys, and external APIs remain forbidden.'
  }
  return 'Analysis-only mode: produces structured analysis and does not execute tools, commands, file edits, PRs, deploys, deletes, or memory writes.'
}

/** 向后兼容：默认安全说明 */
export const agentRuntimeSafetyNote = getAgentRuntimeSafetyNote('sandbox_execution')
