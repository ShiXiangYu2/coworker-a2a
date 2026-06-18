import type { AgentId } from '@/lib/agents/types'

export type ProductionAgentId = AgentId | 'claude_ceo'
export type ProductionRiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type SecurityScope = 'global' | 'resource'
export type ProductionRoleId = 'owner' | 'operator' | 'viewer' | 'agent_record'

export interface SecurityPolicy {
  id: string
  policyVersion: string
  status: 'draft' | 'active' | 'archived'
  scope: SecurityScope
  resourceType?: string
  resourceId?: string
  defaultDecision: 'deny'
  appliesTo: string[]
  allowedRecordActions: string[]
  forbiddenExecutionActions: string[]
  forbiddenApiRouteSemantics: string[]
  requiresHumanConfirmationFor: string[]
  commandPolicyId?: string
  redactionPolicyId?: string
  secretRedactionPolicyId?: string
  apiAuthBoundaryId?: string
  productionObservabilityPolicyId?: string
  auditRequired: true
  correlationRequired: true
  redactionRequired: true
  createdBy: 'kelvin' | 'system'
  createdAt: string
  updatedAt: string
}

export interface AgentProfile {
  id: ProductionAgentId
  displayName: string
  role:
    | 'human_owner'
    | 'ceo_agent'
    | 'product_agent'
    | 'engineering_agent'
    | 'verification_agent'
    | 'customer_agent'
  responsibility: string[]
  allowedActions: string[]
  forbiddenActions: string[]
  allowedOutputTypes: string[]
  forbiddenOutputTypes: string[]
  skillRefs: string[]
  riskLevel: ProductionRiskLevel
  requiresHumanConfirmation: boolean
  permissionBoundaryId: string
  modelIdentity?: 'claude_ceo'
  personaAlias?: 'elon'
  systemPromptRef?: string
  status: 'draft' | 'active' | 'disabled'
  createdAt: string
  updatedAt: string
}

export interface AgentPermissionBoundary {
  id: string
  boundaryVersion: string
  agentId: ProductionAgentId
  allowedActions: string[]
  forbiddenActions: string[]
  allowedOutputTypes: string[]
  forbiddenOutputTypes: string[]
  mayCreateLocalRecord: boolean
  mayCreateToolCallProposal: boolean
  mayRequestEval: boolean
  mayRequestKelvinReview: boolean
  mayApproveLocalRecord: boolean
  mayMutateTaskStatus: false
  mayStartAgentRun: false
  mayExecuteTool: false
  mayCreateExecutableToolRun: false
  mayCallExternalApi: false
  mayCallMcp: false
  mayWriteFile: false
  mayUseShell: false
  mayUseGit: false
  mayCreatePr: false
  mayDeploy: false
  mayDelete: false
  mayDispatchA2A: false
  mayResumeExecution: false
  mayBypassPermission: false
  requiresHumanConfirmation: boolean
  requiresEvalForHighRisk: boolean
  riskLevel: ProductionRiskLevel
  securityPolicyId: string
  commandPolicyId?: string
  createdAt: string
  updatedAt: string
}

export interface SkillIOContract {
  id: string
  contractVersion: string
  skillRef: string
  displayName: string
  description: string
  skillCategory:
    | 'planning'
    | 'product'
    | 'engineering'
    | 'verification'
    | 'customer'
    | 'memory'
    | 'tooling'
    | 'safety'
    | 'observability'
  ownerAgentIds: ProductionAgentId[]
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  allowedSideEffects: 'none'
  forbiddenSideEffects: string[]
  outputMustBeStructured: true
  auditFieldsRequired: string[]
  correlationRequired: true
  redactionRequired: true
  evalRequired: boolean
  humanConfirmationRequired: boolean
  forbiddenOutputs: string[]
  maxInputSizeChars: number
  maxOutputSizeChars: number
  createdAt: string
  updatedAt: string
}

export interface ApiRole {
  id: ProductionRoleId
  description: string
  allowedApiGroups: string[]
  allowedMutationTypes: string[]
  forbiddenMutationTypes: string[]
  mayApproveHighRiskLocalRecord: boolean
}

export interface ApiAuthBoundary {
  id: string
  boundaryVersion: string
  authMode: 'local_single_user' | 'authenticated_user'
  userIdRequired: boolean
  roleRequired: boolean
  roles: ApiRole[]
  defaultRole: 'viewer'
  agentRecordActorRole: 'agent_record'
  mutationRequiresAudit: true
  highRiskMutationRequiresConfirmation: true
  blockedPayloadsRejected: true
  createdAt: string
  updatedAt: string
}

export interface SecretRedactionPolicy {
  id: string
  redactionVersion: string
  status: 'draft' | 'active' | 'archived'
  secretClasses: string[]
  redactedFields?: string[]
  blockedFields?: string[]
  blockedPatterns?: string[]
  blockedPayloadDestinations: string[]
  maxAllowedExcerptChars: number
  allowHashes: boolean
  allowCounts: boolean
  allowSummaries: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductionObservabilityPolicy {
  id: string
  policyVersion: string
  status: 'draft' | 'active' | 'archived'
  correlationRequired: true
  auditRequiredForMutations: true
  observabilityRequiredForHighRiskEvents: true
  redactionRequired: true
  requiredCorrelationSurfaces: string[]
  requiredAuditFields: string[]
  requiredObservabilityFields: string[]
  forbiddenPayloadClasses: string[]
  retentionPolicy: {
    auditEvents: 'append_only'
    observabilityEvents: 'append_only'
    runJournals: 'append_only'
    recoveryPoints: 'view_only'
    resumeTokens: 'view_only'
  }
  createdAt: string
  updatedAt: string
}

export interface ReleaseReadinessCheck {
  id: string
  category:
    | 'security'
    | 'auth'
    | 'redaction'
    | 'audit'
    | 'observability'
    | 'regression'
    | 'ui'
    | 'data'
    | 'build'
    | 'docs'
    | 'deployment_readiness'
  name: string
  description: string
  status: 'pending' | 'passed' | 'failed' | 'blocked' | 'not_applicable'
  required: boolean
  evidenceRefs?: string[]
  checkedAt?: string
}

export interface ReleaseReadinessChecklist {
  id: string
  checklistVersion: string
  targetSprint: 'sprint_10'
  targetRelease?: string
  correlationId: string
  status:
    | 'draft'
    | 'ready_for_review'
    | 'approved_record'
    | 'rejected'
    | 'blocked'
    | 'archived'
  securityPolicyId: string
  regressionGateId: string
  apiAuthBoundaryId?: string
  productionObservabilityPolicyId?: string
  checks: ReleaseReadinessCheck[]
  reviewedBy?: 'kelvin' | 'turing' | 'system'
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}

export interface RegressionCheck {
  id: string
  sprint:
    | 'sprint_1'
    | 'sprint_2'
    | 'sprint_3'
    | 'sprint_4'
    | 'sprint_5'
    | 'sprint_6'
    | 'sprint_7'
    | 'sprint_8'
    | 'sprint_9'
    | 'sprint_10'
  name: string
  expectedBehavior: string
  status: 'pending' | 'passed' | 'failed' | 'blocked' | 'not_applicable'
  evidenceRefs?: string[]
  checkedAt?: string
}

export interface RegressionGate {
  id: string
  gateVersion: string
  correlationId: string
  targetSprint: 'sprint_10'
  status: 'draft' | 'evaluating_record' | 'passed' | 'failed' | 'blocked' | 'archived'
  requiredChecks: RegressionCheck[]
  forbiddenRegressions: string[]
  coverageSummary: Record<
    | 'sprint1'
    | 'sprint2'
    | 'sprint3'
    | 'sprint4'
    | 'sprint5'
    | 'sprint6'
    | 'sprint7'
    | 'sprint8'
    | 'sprint9',
    boolean
  >
  evidenceRefs?: string[]
  findingRefs?: string[]
  reviewedBy?: 'kelvin' | 'turing' | 'system'
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}

export interface LocalReviewRecord {
  id: string
  resourceType: 'release_readiness'
  resourceId: string
  action: 'submit_review' | 'approve_record' | 'reject'
  actorRole: ProductionRoleId
  reviewedBy: string
  decisionReason: string
  statusAfter: ReleaseReadinessChecklist['status']
  executionToken: false
  createdAt: string
}

export interface Sprint10AuditEvent {
  id: string
  eventType: string
  actorType: ProductionRoleId | 'system'
  actorId?: string
  resourceType: string
  resourceId: string
  reason: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface Sprint10ObservabilityEvent {
  id: string
  eventType: string
  resourceType: string
  resourceId: string
  severity: 'info' | 'warn' | 'error'
  message: string
  attributes: Record<string, unknown>
  createdAt: string
}

export const sprint10SafetyNote =
  'Sprint 10 displays production hardening, security, auth, redaction, release readiness, regression, audit, and observability records only. It does not execute Agents or Tools, call external APIs or MCP, write files, run Git, create PRs, deploy, delete, or bypass Kelvin.'
