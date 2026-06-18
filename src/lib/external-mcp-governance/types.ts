export type ExternalMcpStatus =
  | 'proposal'
  | 'draft'
  | 'review'
  | 'approved_record'
  | 'rejected'
  | 'superseded'
  | 'archived'

export type ExternalMcpEvent =
  | 'DRAFT'
  | 'SUBMIT_REVIEW'
  | 'APPROVE_RECORD'
  | 'REJECT'
  | 'SUPERSEDE'
  | 'ARCHIVE'

export type ExternalMcpRiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type SourceRedactionStatus = 'not_required' | 'redacted' | 'blocked'

export type ExternalActionSourceKind =
  | 'agent_result'
  | 'tool_result'
  | 'tool_execution_receipt'
  | 'collaboration_decision'
  | 'file_change_proposal'
  | 'pull_request_plan'
  | 'user_provided_snippet'
  | 'sanitized_context_snapshot'

export interface EndpointMetadata {
  displayHost?: string
  displayPath?: string
  protocol?: 'https' | 'http' | 'local' | 'unknown'
  methodHints?: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OTHER')[]
  rateLimitNotes?: string
  dataBoundaryNotes?: string
}

export interface ExternalIntegrationProfile {
  id: string
  schemaVersion: string
  correlationId: string
  name: string
  providerType: 'generic_http' | 'github' | 'gitlab' | 'slack' | 'lark' | 'email' | 'webhook' | 'mcp' | 'other'
  status: ExternalMcpStatus
  endpointMetadata?: EndpointMetadata
  authMetadata: {
    authType: 'none' | 'api_key_required' | 'oauth_required' | 'token_required' | 'unknown'
    storesSecrets: false
    notes?: string
  }
  allowedRecordActions: string[]
  forbiddenActions: string[]
  riskLevel: ExternalMcpRiskLevel
  requiresHumanConfirmation: boolean
  sourceEvidenceRefs?: string[]
  sourceRedactionStatus: SourceRedactionStatus
  createdBy: 'human' | 'system' | 'agent_record'
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

export interface McpConnectionProfile {
  id: string
  schemaVersion: string
  correlationId: string
  externalIntegrationProfileId?: string
  name: string
  profileMode: 'disabled_local_record'
  connectionState: 'not_connected'
  status: ExternalMcpStatus
  serverMetadata?: {
    displayName?: string
    transportHint?: 'stdio' | 'http' | 'sse' | 'unknown'
    displayHost?: string
    capabilitySummary?: string
  }
  authMetadata: {
    authType: 'none' | 'token_required' | 'oauth_required' | 'unknown'
    storesSecrets: false
  }
  canConnect: false
  canInvokeTool: false
  canListTools: false
  canReadResources: false
  canWriteResources: false
  sourceEvidenceRefs?: string[]
  sourceRedactionStatus: SourceRedactionStatus
  riskLevel: ExternalMcpRiskLevel
  requiresHumanConfirmation: boolean
  createdBy: 'human' | 'system' | 'agent_record'
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

export interface ExternalActionProposal {
  id: string
  schemaVersion: string
  correlationId: string
  taskId?: string
  agentRunId?: string
  toolRunId?: string
  toolExecutionReceiptId?: string
  collaborationDecisionId?: string
  fileChangeProposalId?: string
  pullRequestPlanId?: string
  externalIntegrationProfileId?: string
  mcpConnectionProfileId?: string
  sourceKind: ExternalActionSourceKind
  sourceEvidenceRefs: string[]
  sourceSnapshot?: unknown
  sourceRedactionStatus: SourceRedactionStatus
  status: ExternalMcpStatus
  actionCategory:
    | 'external_api_proposal'
    | 'mcp_governance_proposal'
    | 'webhook_governance_proposal'
    | 'message_governance_proposal'
    | 'sync_governance_proposal'
    | 'schema_review_proposal'
    | 'other'
  title: string
  summary: string
  proposedIntent: string
  proposedPayloadSummary?: string
  endpointMetadataRef?: string
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted' | 'unknown'
  riskAssessmentId?: string
  canCallExternalApi: false
  canConnectMcp: false
  canSendNetworkRequest: false
  canCreateWebhook: false
  canCreateWorker: false
  canCreateQueue: false
  canSendMessage: false
  canReadExternalData: false
  canWriteExternalData: false
  canExecuteToolRun: false
  canStartAgent: false
  canCompleteTask: false
  riskLevel: ExternalMcpRiskLevel
  requiresHumanConfirmation: boolean
  confirmationArtifactId?: string
  createdBy: 'human' | 'system' | 'agent_record'
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  supersededById?: string
  createdAt: string
  updatedAt: string
}

export interface ExternalActionReviewRecord {
  id: string
  schemaVersion: string
  correlationId: string
  externalActionProposalId: string
  riskAssessmentId?: string
  confirmationArtifactId?: string
  status: ExternalMcpStatus
  reviewer: 'kelvin' | 'owner' | 'operator' | 'turing' | 'system'
  verdict: 'approve_record' | 'reject' | 'request_changes' | 'archive'
  rationale: string
  requiredFollowUps?: string[]
  evidenceRefs?: string[]
  canExecute: false
  canCallExternalApi: false
  canConnectMcp: false
  canSendMessage: false
  canCreateWebhook: false
  canCreateWorker: false
  canCreateQueue: false
  canCompleteTask: false
  createdAt: string
  updatedAt: string
}

export interface IntegrationRiskAssessment {
  id: string
  schemaVersion: string
  correlationId: string
  targetType: 'external_integration_profile' | 'mcp_connection_profile' | 'external_action_proposal'
  targetId: string
  status: 'draft' | 'review' | 'approved_record' | 'rejected' | 'archived'
  riskLevel: ExternalMcpRiskLevel
  riskFactors: {
    id: string
    category:
      | 'secrets'
      | 'privacy'
      | 'data_exfiltration'
      | 'external_side_effect'
      | 'auth_scope'
      | 'rate_limit'
      | 'compliance'
      | 'mcp_tool_surface'
      | 'webhook_surface'
      | 'unknown'
    severity: ExternalMcpRiskLevel
    summary: string
    mitigation?: string
  }[]
  recommendation: 'record_only_safe_to_review' | 'requires_kelvin_review' | 'blocked_until_redacted' | 'reject_recommended'
  evidenceRefs?: string[]
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}

export interface IntegrationAuditPolicy {
  id: string
  policyVersion: string
  correlationId: string
  targetSprint: 'sprint_13'
  requiredAuditEvents: string[]
  requiredObservabilityEvents: string[]
  requiredRedactionChecks: string[]
  forbiddenPayloadFields: string[]
  blockedPayloadSurfaces: string[]
  allowRawExternalPayload: false
  allowSecretsInMetadata: false
  allowWebhookDispatch: false
  createdAt: string
  updatedAt: string
}

export type ExternalMcpResourceType =
  | 'external_integration_profile'
  | 'mcp_connection_profile'
  | 'external_action_proposal'
  | 'external_action_review_record'
  | 'integration_risk_assessment'
  | 'integration_audit_policy'

export const sprint13SafetyNote =
  'Sprint 13 records External Integration / MCP governance proposals only. It does not call external APIs, connect MCP, send network requests, create webhooks, create workers or queues, send messages, read or write external systems, execute Agents or ToolRuns, complete Tasks, retry, replay, rollback, or resume execution.'
