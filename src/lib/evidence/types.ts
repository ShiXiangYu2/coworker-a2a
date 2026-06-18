/**
 * Sprint 17 - Read-only Evidence Import Sandbox.
 *
 * Local evidence records only. User-provided summaries are sanitized into
 * evidence snapshots; path / command / URL / endpoint / MCP metadata is never
 * dereferenced.
 */

export type EvidenceImportStatus =
  | 'draft'
  | 'review'
  | 'approved_record'
  | 'rejected'
  | 'archived'

export type EvidenceImportEvent =
  | 'SUBMIT_REVIEW'
  | 'APPROVE_RECORD'
  | 'REJECT'
  | 'ARCHIVE'

export type EvidenceTargetSprint = 'sprint_17'
export type EvidenceBaseline = 'sprint_1_15_sealed_mvp_plus_sprint_16_specs_ready'

export type EvidenceSourceKind =
  | 'user_pasted_text'
  | 'user_provided_file_summary'
  | 'user_provided_command_output_summary'
  | 'user_provided_external_screenshot_description'
  | 'user_provided_sanitized_context_snapshot'
  | 'manual_note'

export type LegacyEvidenceSource =
  | 'github_issue'
  | 'github_pr'
  | 'ci_log'
  | 'manual_json'
  | 'manual_text'
  | 'manual_markdown'
  | 'other'

export type EvidenceSource = EvidenceSourceKind | LegacyEvidenceSource

export type EvidenceStatus = EvidenceImportStatus | 'active' | 'superseded'

export type EvidenceSnapshotKind =
  | 'text_summary'
  | 'file_summary'
  | 'command_output_summary'
  | 'screenshot_description'
  | 'external_context_summary'
  | 'manual_note_summary'

export type EvidenceRedactionStatus = 'sanitized' | 'redacted' | 'rejected_sensitive'
export type EvidenceConfidence = 'low' | 'medium' | 'high'
export type EvidenceCreatedBy = 'user' | 'operator' | 'system_record' | 'system_seed'
export type EvidenceReviewer = 'kelvin' | 'owner' | 'operator'
export type EvidenceReviewVerdict = 'needs_changes' | 'approved_record' | 'rejected'

export type EvidenceReviewTargetType =
  | 'evidence_source_profile'
  | 'evidence_import_record'
  | 'sanitized_evidence_snapshot'
  | 'evidence_redaction_policy'

export type EvidenceUse =
  | 'operator_console'
  | 'department_agent_profile'
  | 'workflow_proposal'
  | 'mvp_readiness'
  | 'future_human_gated_execution_review'

export type EvidenceMetadataField =
  | 'pathHint'
  | 'commandHint'
  | 'urlHint'
  | 'endpointHint'
  | 'mcpServerHint'
  | 'externalSystemName'
  | 'screenshotDescription'

export interface EvidenceImportSourceMetadata {
  pathHint?: string
  commandHint?: string
  urlHint?: string
  endpointHint?: string
  mcpServerHint?: string
  externalSystemName?: string
  screenshotDescription?: string
  metadataOnly: boolean
  mayDereferencePath: boolean
  mayExecuteCommand: boolean
  mayFetchUrl: boolean
  mayCallEndpoint: boolean
  mayConnectMcp: boolean
}

export interface EvidenceSourceProfile {
  id: string
  targetSprint: EvidenceTargetSprint
  sourceKind: EvidenceSourceKind
  displayName: string
  description: string
  collectionMode: 'manual_user_provided_only'
  allowedContentTypes: string[]
  forbiddenContentTypes: string[]
  metadataFields: EvidenceMetadataField[]
  mayDereferencePath: boolean
  mayReadDirectory: boolean
  mayReadClipboard: boolean
  mayExecuteCommand: boolean
  mayExecuteGit: boolean
  mayFetchUrl: boolean
  mayCallExternalApi: boolean
  mayConnectMcp: boolean
  mayReadExternalSystem: boolean
  mayWriteExternalSystem: boolean
  secretHandling: 'reject_or_redact'
  evidenceOnly: boolean
  createdBy: 'user' | 'operator' | 'system_seed'
  correlationId: string
  auditRefs: string[]
  createdAt: string
  updatedAt: string
}

export interface EvidenceRedactionPolicy {
  id: string
  policyVersion: string
  targetSprint: EvidenceTargetSprint
  status: 'draft' | 'active' | 'archived'
  rejectSecrets: boolean
  redactTokens: boolean
  redactCookies: boolean
  redactCredentials: boolean
  redactPrivateKeys: boolean
  redactRawHeaders: boolean
  redactRawPayloads: boolean
  redactPersonalSensitiveData: boolean
  allowSummariesOnly: boolean
  storeRawInput: boolean
  allowRedactedExcerpt: boolean
  maxRedactedExcerptLength: number
  allowedSnapshotKinds: EvidenceSnapshotKind[]
  forbiddenPatterns: string[]
  requiredReviewForSensitiveFindings: boolean
  auditRequired: boolean
  evidenceOnly: boolean
  createdBy: 'operator' | 'system_seed'
  correlationId: string
  auditRefs: string[]
  createdAt: string
  updatedAt: string
}

export interface EvidenceImportRecord {
  id: string
  title: string
  summary: string
  targetSprint: EvidenceTargetSprint
  baseline: EvidenceBaseline
  sourceProfileId: string
  sourceKind: EvidenceSourceKind
  status: EvidenceImportStatus
  userProvidedSummary: string
  rawInputHandling: 'not_stored' | 'stored_redacted_excerpt_only'
  importedContentSummary: string
  redactionPolicyId: string
  sanitizedSnapshotRefs: string[]
  sourceMetadata: EvidenceImportSourceMetadata
  sourceLimitations: string[]
  riskFindings: string[]
  openIssues: string[]
  evidenceOnly: boolean
  isExecutionToken: boolean
  isReleaseToken: boolean
  isDeployToken: boolean
  isExternalAccessToken: boolean
  isTaskCompletionToken: boolean
  mutatesSourceRecords: boolean
  requiresKelvinConfirmation: boolean
  createdBy: 'user' | 'operator'
  reviewedBy?: EvidenceReviewer
  reviewedAt?: string
  correlationId: string
  auditRefs: string[]
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export interface SanitizedEvidenceSnapshot {
  id: string
  importRecordId: string
  targetSprint: EvidenceTargetSprint
  snapshotKind: EvidenceSnapshotKind
  sanitizedTitle: string
  sanitizedSummary: string
  redactedExcerpt?: string
  normalizedFacts: string[]
  sourceLimitations: string[]
  redactionStatus: EvidenceRedactionStatus
  rejectedSensitiveFindings: string[]
  confidence: EvidenceConfidence
  mayBeUsedBy: EvidenceUse[]
  evidenceOnly: boolean
  isExecutionToken: boolean
  isPermissionGrant: boolean
  isReleaseToken: boolean
  isDeployToken: boolean
  isExternalAccessToken: boolean
  isTaskCompletionToken: boolean
  createdBy: 'user' | 'operator' | 'system_record'
  correlationId: string
  auditRefs: string[]
  createdAt: string
}

export interface EvidenceReviewRecord {
  id: string
  targetType: EvidenceReviewTargetType
  targetId: string
  targetSprint: EvidenceTargetSprint
  status: EvidenceImportStatus
  reviewer: EvidenceReviewer
  verdict: EvidenceReviewVerdict
  reviewNotes: string
  confirmationArtifactId?: string
  evidenceOnly: boolean
  doesNotReadFiles: boolean
  doesNotRunCommands: boolean
  doesNotRunGit: boolean
  doesNotFetchUrls: boolean
  doesNotCallExternalSystems: boolean
  doesNotConnectMcp: boolean
  doesNotExecute: boolean
  doesNotRelease: boolean
  doesNotDeploy: boolean
  doesNotCompleteTask: boolean
  createdBy: 'user' | 'operator' | 'system_record'
  correlationId: string
  auditRefs: string[]
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export interface CreateEvidenceSourceProfileInput {
  sourceKind: EvidenceSourceKind
  displayName: string
  description: string
  allowedContentTypes?: string[]
  forbiddenContentTypes?: string[]
  metadataFields?: EvidenceMetadataField[]
  createdBy?: 'user' | 'operator' | 'system_seed'
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateEvidenceImportInput {
  sourceKind: EvidenceSourceKind | LegacyEvidenceSource
  title: string
  userProvidedSummary: string
  importedContentSummary?: string
  sourceProfileId?: string
  redactionPolicyId?: string
  sourceMetadata?: Partial<EvidenceImportSourceMetadata>
  sourceLimitations?: string[]
  riskFindings?: string[]
  openIssues?: string[]
  createdBy?: 'user' | 'operator'
  correlationId?: string
  idempotencyKey?: string
}

export interface CreateEvidenceReviewInput {
  targetType: EvidenceReviewTargetType
  targetId: string
  reviewer: EvidenceReviewer
  verdict: EvidenceReviewVerdict
  reviewNotes: string
  confirmationArtifactId?: string
  createdBy?: 'user' | 'operator' | 'system_record'
  correlationId?: string
  idempotencyKey?: string
}

export interface FindEvidenceQuery {
  source?: EvidenceSource
  sourceKind?: EvidenceSourceKind
  agentId?: string
  taskType?: string
  tags?: string[]
  status?: EvidenceStatus
  limit?: number
  importedBy?: string
}

export interface EvidenceItem {
  id: string
  source: EvidenceSource
  sourceId: string | null
  sourceUrl: string | null
  title: string
  content: string
  metadataJson: string
  contentHash: string
  contentSize: number
  applicableAgentIds: string[]
  applicableTaskTypes: string[]
  tagsJson: string
  status: EvidenceStatus
  importedBy: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateEvidenceInput {
  source: EvidenceSource
  sourceId?: string
  sourceUrl?: string
  title: string
  content: string
  metadata?: Record<string, unknown>
  applicableAgentIds?: string[]
  applicableTaskTypes?: string[]
  tags?: string[]
  importedBy?: string
  idempotencyKey?: string
}

export interface EvidenceMatch {
  evidence: EvidenceItem
  relevanceScore: number
  matchReason: string
}

export const FORBIDDEN_EVIDENCE_STATES = [
  'reading',
  'directory_read',
  'clipboard_read',
  'fetched',
  'called',
  'connected',
  'executed',
  'synced',
  'imported_live',
  'external_loaded',
  'mcp_invoked',
  'agent_started',
  'tool_executed',
  'workflow_executed',
  'pr_created',
  'deployed',
  'published',
  'released',
  'completed',
  'retried',
  'replayed',
  'rolled_back',
  'restored',
  'resumed',
] as const

export const FORBIDDEN_EVIDENCE_ACTION_TERMS = [
  'read file',
  'open path',
  'run command',
  'run git',
  'fetch url',
  'call api',
  'connect mcp',
  'import live',
  'sync now',
  'execute',
  'deploy',
  'release',
  'create pr',
  'retry',
  'replay',
  'rollback',
  'resume execution',
] as const

export const SPRINT_17_BASELINE: EvidenceBaseline = 'sprint_1_15_sealed_mvp_plus_sprint_16_specs_ready'

export const SPRINT_17_SAFETY_NOTE =
  'Sprint 17 imports user-provided evidence summaries only. It does not read files, open paths, run commands, run Git, fetch URLs, call APIs, connect MCP, import live data, sync systems, execute workflows, deploy, release, create PRs, retry, replay, rollback, or resume execution.'

export const sprint17SafetyNote = SPRINT_17_SAFETY_NOTE
