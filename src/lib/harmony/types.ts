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

// 六阶段主生命周期
export type HarmonyTaskLifecyclePhase =
  | 'intake'      // 采访阶段：接收用户需求
  | 'consensus'   // 工程共识阶段：需求澄清和确认
  | 'planning'    // 计划阶段：制定执行计划
  | 'execution'   // 执行阶段：执行任务
  | 'review'      // 审查阶段：审查执行结果
  | 'repair'      // 修复阶段：修复问题

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

export const HARMONY_TASK_LIFECYCLE_PHASES: readonly HarmonyTaskLifecyclePhase[] = [
  'intake',
  'consensus',
  'planning',
  'execution',
  'review',
  'repair',
]

export function isHarmonyTaskStatus(status: string): status is HarmonyTaskStatus {
  return HARMONY_TASK_STATUSES.includes(status as HarmonyTaskStatus)
}

export function isHarmonyTaskLifecyclePhase(phase: string): phase is HarmonyTaskLifecyclePhase {
  return HARMONY_TASK_LIFECYCLE_PHASES.includes(phase as HarmonyTaskLifecyclePhase)
}

// 根据任务状态推断生命周期阶段
export function inferLifecyclePhaseFromStatus(status: HarmonyTaskStatus): HarmonyTaskLifecyclePhase {
  switch (status) {
    case 'draft':
    case 'pending_confirmation':
      return 'intake'
    case 'queued':
      return 'consensus'
    case 'assigned':
      return 'planning'
    case 'blocked':
      return 'execution'
    case 'completed':
      return 'review'
    case 'failed':
    case 'cancelled':
      return 'repair'
    default:
      return 'intake'
  }
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
  | 'agent_task.tool_request_blocked'
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
