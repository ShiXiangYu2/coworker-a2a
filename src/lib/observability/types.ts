export type ObservabilitySeverity = 'debug' | 'info' | 'warn' | 'error'

export type ResourceType =
  | 'chat'
  | 'route_decision'
  | 'task'
  | 'agent_run'
  | 'memory_entry'
  | 'knowledge_item'
  | 'context_packet'
  | 'a2a_message'
  | 'tool_call'
  | 'tool_permission'
  | 'tool_run'
  | 'tool_execution_plan'
  | 'tool_execution_receipt'
  | 'eval_run'
  | 'recovery_point'
  | 'resume_token'
  | 'failure_classification'
  | 'collaboration_session'
  | 'a2a_thread'
  | 'a2a_turn'
  | 'handoff_request'
  | 'collaboration_decision'
  | 'file_change_proposal'
  | 'patch_draft'
  | 'git_change_plan'
  | 'pull_request_plan'
  | 'review_patch_record'
  | 'external_integration_profile'
  | 'mcp_connection_profile'
  | 'external_action_proposal'
  | 'external_action_review_record'
  | 'integration_risk_assessment'
  | 'integration_audit_policy'

export type RunType =
  | 'chat'
  | 'route_decision'
  | 'task'
  | 'agent_run'
  | 'tool_call'
  | 'tool_run'
  | 'eval_run'
  | 'memory_flow'
  | 'knowledge_flow'
  | 'a2a_flow'
  | 'recovery_flow'
  | 'resume_flow'
  | 'collaboration_flow'

export interface RedactionResult {
  status: 'not_required' | 'redacted' | 'blocked'
  redactedFields?: string[]
  blockedReason?: string
  redactionVersion: string
  value?: unknown
}

export interface ObservabilityEvent {
  id: string
  schemaVersion: string
  correlationId: string
  resourceType: ResourceType
  resourceId: string
  eventType: string
  severity: ObservabilitySeverity
  message: string
  source: 'api' | 'ui' | 'system' | 'repository'
  attributes?: Record<string, unknown>
  redaction?: RedactionResult
  createdAt: string
}

export interface AuditLogQuery {
  correlationId?: string
  taskId?: string
  resourceType?: ResourceType
  resourceId?: string
  eventType?: string
  limit?: number
}

export interface RunJournal {
  id: string
  schemaVersion: string
  runType: RunType
  runId: string
  correlationId: string
  seq: number
  eventRefType: 'audit_event' | 'observability_event'
  eventRefId: string
  eventId?: string
  phase?: string
  stateBefore?: string
  stateAfter?: string
  inputHash?: string
  outputHash?: string
  inputSnapshot?: unknown
  outputSnapshot?: unknown
  result:
    | 'created'
    | 'started'
    | 'completed'
    | 'blocked'
    | 'failed'
    | 'cancelled'
    | 'skipped'
    | 'recorded'
  failureClassificationId?: string
  createdAt: string
}

export interface RecoveryPoint {
  id: string
  schemaVersion: string
  snapshotSchemaVersion: string
  correlationId: string
  resourceType: ResourceType
  resourceId: string
  resourceStatusAtSnapshot?: string
  reason: string
  snapshot?: unknown
  snapshotHash?: string
  redactionStatus: RedactionResult['status']
  redaction?: RedactionResult
  restorableViewOnly: true
  canTriggerExecution: false
  createdBy: string
  createdAt: string
}

export interface ResumeToken {
  id: string
  schemaVersion: string
  tokenHash: string
  correlationId: string
  resourceType: ResourceType
  resourceId: string
  mode: 'view_only'
  viewContext: Record<string, unknown>
  maxUses?: number
  useCount: number
  expiresAt?: string
  revokedAt?: string
  revokedReason?: string
  createdBy: string
  lastUsedAt?: string
  createdAt: string
  updatedAt: string
}

export interface FailureClassification {
  id: string
  schemaVersion: string
  correlationId: string
  resourceType: ResourceType
  resourceId: string
  category:
    | 'validation'
    | 'policy_denied'
    | 'redaction_blocked'
    | 'not_found'
    | 'runtime_error'
    | 'external_unavailable'
    | 'unknown'
  severity: 'low' | 'medium' | 'high' | 'critical'
  retryable: boolean
  retryableReason: string
  message: string
  evidence?: unknown
  createdBy: string
  createdAt: string
}

export interface TimelineItem {
  kind: 'audit_event' | 'observability_event' | 'run_journal' | 'recovery_point' | 'failure_classification'
  id: string
  correlationId?: string
  eventType?: string
  resourceType?: string
  resourceId?: string
  message?: string
  createdAt: string
  data: unknown
}

export const sprint8SafetyNote =
  'Sprint 8 records observability, audit, recovery points, resume view context, and failure classifications only. It does not replay, retry, restore database state, execute agents or tools, write memory, dispatch A2A, call external APIs, or change target statuses.'
