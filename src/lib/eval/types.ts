import type { AgentId } from '@/lib/agents/types'

export type EvalTargetType =
  | 'route_decision'
  | 'harmony_task'
  | 'agent_run'
  | 'agent_result'
  | 'memory_entry'
  | 'knowledge_item'
  | 'context_packet'
  | 'a2a_message'
  | 'tool_call'
  | 'tool_permission'
  | 'collaboration_session'
  | 'a2a_thread'
  | 'a2a_turn'
  | 'handoff_request'
  | 'collaboration_decision'

export type EvalTargetStatus = 'active' | 'superseded' | 'cancelled'
export type EvalTargetSource =
  | 'manual'
  | 'task_ui'
  | 'agent_result_card'
  | 'tool_call_card'
  | 'api'
  | 'system_test'

export interface EvalTarget {
  id: string
  targetType: EvalTargetType
  targetId: string
  routeDecisionId?: string
  taskId?: string
  agentRunId?: string
  agentResultId?: string
  toolCallId?: string
  toolPermissionId?: string
  memoryEntryId?: string
  knowledgeItemId?: string
  contextPacketId?: string
  a2aMessageId?: string
  collaborationSessionId?: string
  a2aThreadId?: string
  a2aTurnId?: string
  handoffRequestId?: string
  collaborationDecisionId?: string
  source: EvalTargetSource
  snapshot: unknown
  snapshotVersion: string
  snapshotHash?: string
  status: EvalTargetStatus
  idempotencyKey?: string
  correlationId?: string
  createdAt: string
  updatedAt: string
}

export type EvalRunStatus =
  | 'created'
  | 'running'
  | 'completed'
  | 'blocked'
  | 'failed'
  | 'cancelled'

export type EvalRunEvent =
  | 'START'
  | 'COMPLETE'
  | 'BLOCK'
  | 'FAIL'
  | 'CANCEL'

export type EvalRunTrigger =
  | 'manual'
  | 'task_ui'
  | 'agent_result_card'
  | 'tool_call_card'
  | 'api'
  | 'system_test'

export type EvalCheckCategory =
  | 'schema'
  | 'state_machine'
  | 'safety'
  | 'permission'
  | 'confirmation'
  | 'quality'
  | 'consistency'
  | 'regression'
  | 'provenance'

/**
 * 四层 Eval 体系（来自 auto-dev-framework）
 *
 * - functional:  功能正确层 — 做没做对
 * - performance: 性能安全层 — 稳不稳、安全不安全
 * - boundary:    边界异常层 — 坏情况能不能处理
 * - business:    业务价值层 — 值不值得做
 */
export type EvalLayerCategory = 'functional' | 'performance' | 'boundary' | 'business'

export type EvalCheckStatus = 'passed' | 'warned' | 'failed' | 'blocked' | 'skipped'
export type EvalSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export interface EvalCheck {
  id: string
  evalRunId: string
  evalTargetId: string
  checkKey: string
  title: string
  category: EvalCheckCategory
  /** 四层 Eval 分类（functional / performance / boundary / business） */
  layer?: EvalLayerCategory
  status: EvalCheckStatus
  severity: EvalSeverity
  confidence: number
  targetPath?: string
  targetField?: string
  evidence: string[]
  evidenceRefs?: string[]
  recommendation?: string
  createdAt: string
}

export type EvalFindingCategory =
  | 'schema'
  | 'safety'
  | 'permission'
  | 'confirmation'
  | 'quality'
  | 'state'
  | 'regression'
  | 'provenance'

export type EvalFindingStatus =
  | 'open'
  | 'review_requested'
  | 'reviewed'
  | 'dismissed'
  | 'cancelled'

export interface EvalFinding {
  id: string
  evalRunId: string
  evalTargetId: string
  relatedCheckIds: string[]
  severity: EvalSeverity
  category: EvalFindingCategory
  title: string
  description: string
  targetPath?: string
  targetField?: string
  evidence: string[]
  evidenceRefs?: string[]
  recommendation: string
  status: EvalFindingStatus
  needsHumanReview: boolean
  confirmationArtifactId?: string
  reviewedBy?: string
  reviewedAt?: string
  reviewDecision?: 'accepted' | 'dismissed' | 'deferred'
  reviewReason?: string
  createdAt: string
  updatedAt: string
}

export type QualityGateValue =
  | 'pass'
  | 'warn'
  | 'fail'
  | 'needs_human_review'
  | 'blocked'

export interface QualityGateDecision {
  gateVersion: string
  sourceEvalRunId: string
  checkIds: string[]
  findingIds: string[]
  decision: QualityGateValue
  confidence: number
  summary: string
  reasons: string[]
  requiredActions: string[]
  recommendedOwnerAgentId?: AgentId
  blocksFutureExecutionRecommendation: boolean
  requiresKelvinReview: boolean
  evaluatedAt: string
}

export interface EvalRun {
  id: string
  evalTargetId: string
  targetType: EvalTargetType
  targetId: string
  evaluatorId: 'turing' | 'system_rules' | 'kelvin' | 'system_test'
  evaluatorMode: 'deterministic_local' | 'manual_review'
  status: EvalRunStatus
  trigger: EvalRunTrigger
  checksSummary: {
    total: number
    passed: number
    warned: number
    failed: number
    blocked: number
  }
  qualityGateDecision?: QualityGateDecision
  inputSnapshot: unknown
  outputSnapshot?: unknown
  error?: {
    code: string
    message: string
  }
  idempotencyKey?: string
  correlationId?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface EvalRunBundle {
  evalRun: EvalRun
  evalTarget: EvalTarget
  checks: EvalCheck[]
  findings: EvalFinding[]
}

export interface CreateEvalTargetInput {
  targetType: EvalTargetType
  targetId: string
  source?: EvalTargetSource
  idempotencyKey?: string
  correlationId?: string
}

export interface CreateEvalRunInput {
  evalTargetId: string
  trigger?: EvalRunTrigger
  idempotencyKey?: string
}

export interface ReviewEvalFindingInput {
  reviewedBy?: string
  decisionReason: string
}

export const sprint7SafetyNote =
  'Sprint 7 records verification checks, findings, and quality gate recommendations only. It does not execute tools, call external APIs, modify files, create PRs, deploy, delete, send A2A messages, approve memory, or automatically change task state.'
