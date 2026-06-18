import type { AgentId } from '@/lib/agents/types'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface AgentTeam {
  id: string
  name: string
  purpose: string
  status: 'active' | 'archived'
  leadAgentId: AgentId
  memberAgentIds: AgentId[]
  collaborationMode:
    | 'ceo_led'
    | 'product_engineering_review'
    | 'verification_review'
    | 'customer_feedback_review'
  riskTier: 'low' | 'medium' | 'high'
  defaultRequiresHumanConfirmation: boolean
  createdBy: 'system' | 'human'
  createdAt: string
  updatedAt: string
}

export type CollaborationSessionStatus =
  | 'draft'
  | 'queued_for_review'
  | 'active'
  | 'paused'
  | 'waiting_human'
  | 'completed_record'
  | 'blocked'
  | 'rejected'
  | 'cancelled'
  | 'superseded'
  | 'archived'

export type CollaborationSessionEvent =
  | 'SUBMIT_REVIEW'
  | 'OPEN_RECORD'
  | 'PAUSE'
  | 'WAIT_HUMAN'
  | 'COMPLETE_RECORD'
  | 'BLOCK'
  | 'REJECT'
  | 'CANCEL'
  | 'SUPERSEDE'
  | 'ARCHIVE'

export interface CollaborationParticipant {
  agentId: AgentId
  role: 'lead' | 'product' | 'engineering' | 'verification' | 'customer' | 'human_owner' | 'observer'
  responsibility: string
}

export interface CollaborationPlan {
  plannedByAgentId?: AgentId
  planSource: 'ceo_record' | 'human' | 'system' | 'agent_result_record'
  sourceSnapshot?: unknown
  steps: {
    index: number
    title: string
    ownerAgentId: AgentId
    expectedOutput: string
    requiresHumanConfirmation: boolean
  }[]
  constraints: string[]
  forbiddenActions: string[]
}

export interface CollaborationSession {
  id: string
  idempotencyKey?: string
  correlationId: string
  taskId?: string
  sourceA2AMessageId?: string
  sourceAgentRunId?: string
  sourceEvalRunId?: string
  teamId?: string
  status: CollaborationSessionStatus
  objective: string
  summary?: string
  riskLevel: RiskLevel
  requiresHumanConfirmation: boolean
  participants: CollaborationParticipant[]
  plan: CollaborationPlan
  confirmationArtifactId?: string
  supersedesCollaborationSessionId?: string
  supersededByCollaborationSessionId?: string
  createdBy: 'human' | 'system' | 'agent_record'
  createdAt: string
  updatedAt: string
}

export type A2AThreadStatus = 'draft' | 'open' | 'waiting_human' | 'closed_record' | 'blocked' | 'cancelled' | 'archived'
export type A2AThreadEvent = 'OPEN' | 'WAIT_HUMAN' | 'CLOSE_RECORD' | 'BLOCK' | 'CANCEL' | 'ARCHIVE'

export interface A2AThread {
  id: string
  idempotencyKey?: string
  correlationId: string
  collaborationSessionId: string
  taskId?: string
  status: A2AThreadStatus
  topic: string
  purpose: 'handoff' | 'review' | 'planning' | 'clarification' | 'decision' | 'customer_feedback'
  participantAgentIds: AgentId[]
  latestTurnSeq: number
  createdBy: 'human' | 'system' | 'agent_record'
  createdAt: string
  updatedAt: string
}

export type A2ATurnStatus = 'draft' | 'recorded' | 'queued_for_review' | 'approved_record' | 'rejected' | 'superseded' | 'archived'
export type A2ATurnEvent = 'RECORD' | 'SUBMIT_REVIEW' | 'APPROVE_RECORD' | 'REJECT' | 'SUPERSEDE' | 'ARCHIVE'

export interface A2ATurn {
  id: string
  idempotencyKey?: string
  correlationId: string
  collaborationSessionId: string
  threadId: string
  taskId?: string
  sourceA2AMessageId?: string
  sourceAgentRunId?: string
  seq: number
  speakerAgentId: AgentId
  audienceAgentIds: AgentId[]
  turnType: 'plan' | 'handoff_note' | 'review_request' | 'review_response' | 'clarification' | 'finding' | 'decision_input' | 'human_note'
  status: A2ATurnStatus
  title: string
  body: string
  inputSnapshot?: unknown
  outputSnapshot?: unknown
  riskLevel: RiskLevel
  requiresHumanConfirmation: boolean
  confirmationArtifactId?: string
  createdBy: 'human' | 'system' | 'agent_record'
  createdAt: string
  updatedAt: string
}

export type HandoffRequestStatus = 'draft' | 'queued_for_review' | 'approved_record' | 'rejected' | 'cancelled' | 'superseded' | 'archived'
export type HandoffRequestEvent = 'SUBMIT_REVIEW' | 'APPROVE_RECORD' | 'REJECT' | 'CANCEL' | 'SUPERSEDE' | 'ARCHIVE'

export interface HandoffRequest {
  id: string
  idempotencyKey?: string
  correlationId: string
  collaborationSessionId: string
  threadId?: string
  taskId?: string
  sourceA2AMessageId?: string
  sourceTurnId?: string
  fromAgentId: AgentId
  toAgentId: AgentId
  status: HandoffRequestStatus
  handoffType:
    | 'product_to_engineering'
    | 'engineering_to_verification'
    | 'verification_to_product'
    | 'customer_to_product'
    | 'ceo_to_specialist'
    | 'specialist_to_ceo'
    | 'escalate_to_kelvin'
  reason: string
  requestedScope: string
  expectedOutput: string
  contextRefs: {
    contextPacketIds?: string[]
    memoryEntryIds?: string[]
    knowledgeItemIds?: string[]
    agentRunIds?: string[]
    evalRunIds?: string[]
    toolCallIds?: string[]
  }
  riskLevel: RiskLevel
  requiresHumanConfirmation: boolean
  confirmationArtifactId?: string
  createdBy: 'human' | 'system' | 'agent_record'
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

export type CollaborationDecisionStatus = 'draft' | 'queued_for_review' | 'approved_record' | 'rejected' | 'superseded' | 'archived'
export type CollaborationDecisionEvent = 'SUBMIT_REVIEW' | 'APPROVE_RECORD' | 'REJECT' | 'SUPERSEDE' | 'ARCHIVE'

export interface CollaborationDecision {
  id: string
  idempotencyKey?: string
  correlationId: string
  collaborationSessionId: string
  threadId?: string
  taskId?: string
  status: CollaborationDecisionStatus
  decisionType:
    | 'recommend_next_step'
    | 'confirm_scope'
    | 'request_human_input'
    | 'record_risk'
    | 'defer'
    | 'block_record'
    | 'handoff_summary'
  title: string
  rationale: string
  recommendation: string
  decisionInputs: {
    turnIds?: string[]
    handoffRequestIds?: string[]
    evalRunIds?: string[]
    contextPacketIds?: string[]
    toolCallIds?: string[]
  }
  riskLevel: RiskLevel
  requiresHumanConfirmation: boolean
  confirmationArtifactId?: string
  createdBy: 'human' | 'system' | 'agent_record'
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

export interface CollaborationBundle {
  session: CollaborationSession
  threads: A2AThread[]
  turns: A2ATurn[]
  handoffs: HandoffRequest[]
  decisions: CollaborationDecision[]
}

export const sprint9SafetyNote =
  'Sprint 9 records local multi-Agent collaboration, handoff, review, and decision records only. It does not send A2A messages, start Agents, run tools, call external APIs, modify files, create PRs, deploy, delete, or continue autonomous loops.'

