import type { AgentId, RouteDecision, RouteDecisionType, RouteSideEffects, RouteStatus } from '@/lib/agents/types'

export type HarmonyTaskType =
  | 'product'
  | 'engineering'
  | 'verification'
  | 'customer'
  | 'coordination'
  | 'chat'
  | 'unsupported'

export type HarmonyTaskStatus =
  | 'draft'
  | 'pending_confirmation'
  | 'queued'
  | 'assigned'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'cancelled'

export const HARMONY_TASK_STATUSES: readonly HarmonyTaskStatus[] = [
  'draft',
  'pending_confirmation',
  'queued',
  'assigned',
  'blocked',
  'completed',
  'failed',
  'cancelled',
]

export function isHarmonyTaskStatus(status: string): status is HarmonyTaskStatus {
  return HARMONY_TASK_STATUSES.includes(status as HarmonyTaskStatus)
}

export type HarmonyTaskEvent =
  | 'CREATE_FROM_ROUTE'
  | 'REQUIRE_CONFIRMATION'
  | 'APPROVE_CONFIRMATION'
  | 'REJECT_CONFIRMATION'
  | 'REQUEST_CONFIRMATION_FROM_ANALYSIS'
  | 'QUEUE'
  | 'ASSIGN_PLACEHOLDER'
  | 'MARK_COMPLETED'
  | 'BLOCK'
  | 'CANCEL'
  | 'FAIL'

export type HarmonyTaskRunStatus =
  | 'created'
  | 'waiting'
  | 'blocked'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type HarmonyTaskRunTrigger = 'route_decision' | 'manual'
export type HarmonyRuntimeKind = 'harmony_planning'

export type HarmonyTaskStepKind =
  | 'route_decision'
  | 'human_confirmation'
  | 'agent_assignment_placeholder'
  | 'agent_runtime_analysis'
  | 'final_state'

export type HarmonyTaskStepStatus =
  | 'pending'
  | 'blocked'
  | 'skipped'
  | 'completed'
  | 'failed'

export type HarmonyNextRecommendedAction =
  | 'continue'
  | 'retry'
  | 'stop'
  | 'escalate'
  | 'show_task'
  | 'ask_human_confirmation'

export type HarmonyAuditEventType =
  | 'task.created'
  | 'task.status_changed'
  | 'task.cancelled'
  | 'task.confirmation_required'
  | 'task.confirmation_approved'
  | 'task.confirmation_rejected'
  | 'task.run_created'
  | 'task.step_created'
  | 'task.step_completed'
  | 'task.blocked'
  | 'task.failed'
  | 'agent.run_created'
  | 'agent.run_started'
  | 'agent.run_completed'
  | 'agent.run_blocked'
  | 'agent.run_failed'
  | 'agent.run_cancelled'
  | 'agent_task.started'
  | 'agent_task.completed'
  | 'agent_task.failed'
  | 'chathub.request_received'
  | 'chathub.route_decided'
  | 'chathub.response_completed'
  | 'chathub.response_failed'

export type HarmonyActorType = 'user' | 'system' | 'router' | 'agent_placeholder' | 'chathub' | 'agent'

export type ConfirmationStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export type ConfirmationAction =
  | 'create_task'
  | 'high_risk_task'
  | 'future_tool_execution'
  | 'future_external_side_effect'

export interface HarmonyTask {
  id: string
  idempotencyKey?: string
  conversationId?: string
  sourceMessageId?: string
  sourceMessageText: string
  title: string
  description: string
  type: HarmonyTaskType
  status: HarmonyTaskStatus
  routeDecisionType: RouteDecisionType
  routeStatus: RouteStatus
  targetAgentId?: AgentId
  confidence: number
  reason: string
  statusReason?: string
  matchedSignals: string[]
  routeDecisionSnapshot: RouteDecision
  requiresHumanConfirmation: boolean
  sideEffects: RouteSideEffects
  createdBy: 'user' | 'router' | 'system'
  createdAt: string
  updatedAt: string
}

export interface HarmonyTaskRun {
  id: string
  taskId: string
  status: HarmonyTaskRunStatus
  trigger: HarmonyTaskRunTrigger
  attempt: number
  runtimeKind: HarmonyRuntimeKind
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface HarmonyTaskStep {
  id: string
  taskId: string
  taskRunId: string
  index: number
  kind: HarmonyTaskStepKind
  status: HarmonyTaskStepStatus
  agentId?: AgentId
  summary: string
  input: unknown
  output?: unknown
  confidence?: number
  nextRecommendedAction?: HarmonyNextRecommendedAction
  sideEffects: RouteSideEffects
  createdAt: string
  updatedAt: string
}

export interface HarmonyAuditEvent {
  id: string
  correlationId?: string
  taskId?: string
  taskRunId?: string
  taskStepId?: string
  eventType: HarmonyAuditEventType
  actorType: HarmonyActorType
  actorId?: string
  beforeStatus?: string
  afterStatus?: string
  reason: string
  payload?: unknown
  createdAt: string
}

export interface HarmonyConfirmationArtifact {
  id: string
  taskId: string
  status: ConfirmationStatus
  action: ConfirmationAction
  reason: string
  requiresHumanOwner: true
  mustReview: string[]
  forbiddenRuntimeActions: string[]
  approvedBy?: string
  approvedAt?: string
  decisionReason?: string
  expiresAt?: string
  payload: unknown
  createdAt: string
  updatedAt: string
}

export interface HarmonyTaskBundle {
  task?: HarmonyTask
  taskRun?: HarmonyTaskRun
  steps: HarmonyTaskStep[]
  auditEvents: HarmonyAuditEvent[]
  confirmationArtifact?: HarmonyConfirmationArtifact
  skippedReason?: 'chat_only' | 'unsupported'
}

export interface CreateTaskFromRouteInput {
  idempotencyKey?: string
  conversationId?: string
  sourceMessageId?: string
  sourceMessageText: string
  routeDecision: RouteDecision
}

export const emptySideEffects: RouteSideEffects = {
  filesChanged: [],
  branchesCreated: [],
  prsCreated: [],
  issuesUpdated: [],
}

export function hasSideEffects(sideEffects: RouteSideEffects): boolean {
  return (
    sideEffects.filesChanged.length > 0 ||
    sideEffects.branchesCreated.length > 0 ||
    sideEffects.prsCreated.length > 0 ||
    sideEffects.issuesUpdated.length > 0
  )
}
