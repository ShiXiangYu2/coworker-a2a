import type { AgentId, RouteDecision, RouteSideEffects } from '@/lib/agents/types'
import {
  emptySideEffects,
  hasSideEffects,
  type ConfirmationAction,
  type CreateTaskFromRouteInput,
  type HarmonyAuditEvent,
  type HarmonyTaskBundle,
  type HarmonyTaskStep,
  type HarmonyTaskStatus,
  type HarmonyTaskType,
} from './types'

const agentTaskTypes: Record<AgentId, HarmonyTaskType> = {
  kelvin: 'coordination',
  elon: 'coordination',
  jobs: 'product',
  linus: 'engineering',
  turing: 'verification',
  bezos: 'customer',
}

export const defaultMustReview = [
  'scope of requested action',
  'risk of external or irreversible side effects',
  'security-sensitive paths, credentials, permissions, or production configuration',
  'database schema or data migration risk',
  'whether Sprint 3 can safely continue without execution',
]

export const defaultForbiddenRuntimeActions = [
  'execute-agent',
  'execute-tool',
  'run-shell-command',
  'write-file',
  'delete-file',
  'git-push',
  'create-pr',
  'merge-pr',
  'deploy',
  'send-email',
  'call-external-api',
  'write-memory',
]

export function resolveTaskType(decision: RouteDecision): HarmonyTaskType {
  if (!decision.targetAgentId) return 'unsupported'
  return agentTaskTypes[decision.targetAgentId] ?? 'unsupported'
}

export function resolveInitialStatus(decision: RouteDecision): HarmonyTaskStatus | 'skip' {
  if (decision.decisionType === 'unsupported' || decision.status === 'unsupported') {
    return 'skip'
  }

  if (hasSideEffects(decision.sideEffects)) return 'pending_confirmation'
  if (decision.requiresHumanConfirmation) return 'pending_confirmation'
  if (decision.decisionType === 'needs_human_confirmation') return 'pending_confirmation'
  if (decision.status === 'blocked') return 'blocked'
  if (
    decision.decisionType === 'delegate_to_agent' ||
    decision.decisionType === 'create_task'
  ) {
    return 'queued'
  }
  if (decision.decisionType === 'chat_only') return 'skip'

  return 'blocked'
}

export function buildHarmonyTitle(message: string, decision: RouteDecision): string {
  const suggested = decision.suggestedTaskTitle?.trim()
  if (suggested) return suggested.slice(0, 120)

  const compact = message.trim().replace(/\s+/g, ' ')
  if (compact) return compact.length > 80 ? `${compact.slice(0, 77)}...` : compact

  return 'Untitled Harmony Task'
}

export function normalizeSideEffects(sideEffects?: RouteSideEffects): RouteSideEffects {
  return {
    filesChanged: sideEffects?.filesChanged ?? [],
    branchesCreated: sideEffects?.branchesCreated ?? [],
    prsCreated: sideEffects?.prsCreated ?? [],
    issuesUpdated: sideEffects?.issuesUpdated ?? [],
  }
}

export function createRouteToTaskDraft(input: CreateTaskFromRouteInput): HarmonyTaskBundle {
  const routeDecision: RouteDecision = {
    ...input.routeDecision,
    sideEffects: normalizeSideEffects(input.routeDecision.sideEffects),
  }

  const initialStatus = resolveInitialStatus(routeDecision)

  if (initialStatus === 'skip') {
    return {
      steps: [],
      auditEvents: [],
      skippedReason:
        routeDecision.decisionType === 'chat_only' ? 'chat_only' : 'unsupported',
    }
  }

  const now = new Date().toISOString()
  const isConfirmation = initialStatus === 'pending_confirmation'
  const taskId = 'draft-task'
  const runId = 'draft-run'
  const routeStepId = 'draft-step-route'
  const confirmationStepId = 'draft-step-confirmation'
  const confirmationId = 'draft-confirmation'

  const task = {
    id: taskId,
    idempotencyKey: input.idempotencyKey,
    conversationId: input.conversationId,
    sourceMessageId: input.sourceMessageId,
    sourceMessageText: input.sourceMessageText,
    title: buildHarmonyTitle(input.sourceMessageText, routeDecision),
    description: routeDecision.reason,
    type: resolveTaskType(routeDecision),
    status: initialStatus,
    routeDecisionType: routeDecision.decisionType,
    routeStatus: routeDecision.status,
    targetAgentId: routeDecision.targetAgentId,
    confidence: routeDecision.confidence,
    reason: routeDecision.reason,
    statusReason: statusReasonFor(initialStatus, routeDecision),
    matchedSignals: routeDecision.matchedSignals,
    routeDecisionSnapshot: routeDecision,
    requiresHumanConfirmation: isConfirmation,
    sideEffects: emptySideEffects,
    createdBy: 'router' as const,
    createdAt: now,
    updatedAt: now,
  }

  const taskRun = {
    id: runId,
    taskId,
    status: isConfirmation || initialStatus === 'blocked' ? 'blocked' as const : 'waiting' as const,
    trigger: 'route_decision' as const,
    attempt: 1,
    runtimeKind: 'harmony_planning' as const,
    createdAt: now,
    updatedAt: now,
  }

  const routeStep = {
    id: routeStepId,
    taskId,
    taskRunId: runId,
    index: 0,
    kind: 'route_decision' as const,
    status: 'completed' as const,
    agentId: routeDecision.targetAgentId,
    summary: 'RouteDecision captured as a Harmony planning step.',
    input: routeDecision,
    output: { initialStatus },
    confidence: routeDecision.confidence,
    nextRecommendedAction: isConfirmation ? 'ask_human_confirmation' as const : 'show_task' as const,
    sideEffects: emptySideEffects,
    createdAt: now,
    updatedAt: now,
  }

  const steps: HarmonyTaskStep[] = [routeStep]
  const auditEvents: HarmonyAuditEvent[] = [
    {
      id: 'draft-audit-created',
      taskId,
      eventType: 'task.created' as const,
      actorType: 'router' as const,
      actorId: routeDecision.targetAgentId,
      afterStatus: initialStatus,
      reason: 'RouteDecision converted to Harmony Task. Sprint 3 does not execute agents or tools.',
      payload: {
        targetAgentId: routeDecision.targetAgentId,
        confidence: routeDecision.confidence,
        matchedSignals: routeDecision.matchedSignals,
      },
      createdAt: now,
    },
    {
      id: 'draft-audit-run',
      taskId,
      taskRunId: runId,
      eventType: 'task.run_created' as const,
      actorType: 'system' as const,
      reason: 'Harmony planning run created. This is not an Agent Runtime run.',
      payload: { runtimeKind: 'harmony_planning' },
      createdAt: now,
    },
    {
      id: 'draft-audit-step',
      taskId,
      taskRunId: runId,
      taskStepId: routeStepId,
      eventType: 'task.step_created' as const,
      actorType: 'system' as const,
      reason: 'Route decision step created.',
      createdAt: now,
    },
  ]

  let confirmationArtifact

  if (isConfirmation) {
    steps.push({
      id: confirmationStepId,
      taskId,
      taskRunId: runId,
      index: 1,
      kind: 'human_confirmation',
      status: 'blocked',
      agentId: 'kelvin',
      summary: 'Kelvin confirmation required before queueing. Approval does not execute side effects.',
      input: routeDecision,
      confidence: routeDecision.confidence,
      nextRecommendedAction: 'ask_human_confirmation',
      sideEffects: emptySideEffects,
      createdAt: now,
      updatedAt: now,
    })

    confirmationArtifact = {
      id: confirmationId,
      taskId,
      status: 'pending' as const,
      action: confirmationAction(routeDecision),
      reason: confirmationReason(routeDecision),
      requiresHumanOwner: true as const,
      mustReview: defaultMustReview,
      forbiddenRuntimeActions: defaultForbiddenRuntimeActions,
      payload: {
        routeDecisionType: routeDecision.decisionType,
        targetAgentId: routeDecision.targetAgentId,
        sideEffects: routeDecision.sideEffects,
      },
      createdAt: now,
      updatedAt: now,
    }

    auditEvents.push({
      id: 'draft-audit-confirmation',
      taskId,
      taskRunId: runId,
      taskStepId: confirmationStepId,
      eventType: 'task.confirmation_required',
      actorType: 'system',
      actorId: 'kelvin',
      afterStatus: 'pending_confirmation',
      reason: confirmationArtifact.reason,
      payload: { confirmationArtifactId: confirmationId },
      createdAt: now,
    })
  }

  if (initialStatus === 'blocked') {
    auditEvents.push({
      id: 'draft-audit-blocked',
      taskId,
      eventType: 'task.blocked',
      actorType: 'system',
      afterStatus: 'blocked',
      reason: 'RouteDecision was blocked and no executable queue entry was created.',
      createdAt: now,
    })
  }

  return {
    task,
    taskRun,
    steps,
    auditEvents,
    confirmationArtifact,
  }
}

function confirmationAction(decision: RouteDecision): ConfirmationAction {
  if (hasSideEffects(decision.sideEffects)) return 'future_external_side_effect'
  if (decision.decisionType === 'needs_human_confirmation') return 'high_risk_task'
  return 'create_task'
}

function confirmationReason(decision: RouteDecision): string {
  if (hasSideEffects(decision.sideEffects)) {
    return 'RouteDecision includes non-empty future side effects and must stop at human confirmation.'
  }

  return decision.reason || 'Human confirmation is required before queueing this Harmony task.'
}

function statusReasonFor(status: HarmonyTaskStatus, decision: RouteDecision): string {
  if (status === 'queued') {
    return 'Task queued for Harmony planning only. Sprint 3 does not execute agents or tools.'
  }
  if (status === 'pending_confirmation') {
    return 'Task requires Kelvin confirmation. Approval only moves it to queued.'
  }
  if (status === 'blocked') {
    return decision.reason || 'Task is blocked by RouteDecision.'
  }
  return 'Harmony task created.'
}
