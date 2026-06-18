import type { AgentId, RouteSideEffects } from '@/lib/agents/types'
import type { ToolCallCandidate } from '@/lib/tools/types'

export type AgentRuntimeMode = 'analysis_only'
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
  version: 'sprint-4',
  mode: 'analysis_only',
  enabledAgentIds: ['elon', 'jobs', 'linus', 'turing', 'bezos'],
  forbiddenActions: [
    'execute-tool',
    'run-shell-command',
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

export const agentRuntimeSafetyNote =
  'Sprint 4 only produces structured analysis and does not execute tools, commands, file edits, PRs, deploys, deletes, or memory writes.'
