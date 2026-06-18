import { decodeJson } from '@/lib/harmony/serializers'
import type {
  ExternalActionProposal,
  ExternalActionReviewRecord,
  ExternalIntegrationProfile,
  IntegrationAuditPolicy,
  IntegrationRiskAssessment,
  McpConnectionProfile,
} from './types'

function dateToString(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined
}

export function serializeExternalIntegrationProfile(record: {
  id: string
  schemaVersion: string
  correlationId: string
  name: string
  providerType: string
  status: string
  endpointMetadataJson: string | null
  authMetadataJson: string
  allowedRecordActionsJson: string
  forbiddenActionsJson: string
  riskLevel: string
  requiresHumanConfirmation: boolean
  sourceEvidenceRefsJson: string | null
  sourceRedactionStatus: string
  createdBy: string
  reviewedBy: string | null
  reviewedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}): ExternalIntegrationProfile {
  return {
    id: record.id,
    schemaVersion: record.schemaVersion,
    correlationId: record.correlationId,
    name: record.name,
    providerType: record.providerType as ExternalIntegrationProfile['providerType'],
    status: record.status as ExternalIntegrationProfile['status'],
    endpointMetadata: decodeJson(record.endpointMetadataJson, undefined),
    authMetadata: decodeJson(record.authMetadataJson, { authType: 'unknown', storesSecrets: false }),
    allowedRecordActions: decodeJson(record.allowedRecordActionsJson, []),
    forbiddenActions: decodeJson(record.forbiddenActionsJson, []),
    riskLevel: record.riskLevel as ExternalIntegrationProfile['riskLevel'],
    requiresHumanConfirmation: record.requiresHumanConfirmation,
    sourceEvidenceRefs: decodeJson(record.sourceEvidenceRefsJson, undefined),
    sourceRedactionStatus: record.sourceRedactionStatus as ExternalIntegrationProfile['sourceRedactionStatus'],
    createdBy: record.createdBy as ExternalIntegrationProfile['createdBy'],
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: dateToString(record.reviewedAt),
    rejectionReason: record.rejectionReason ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeMcpConnectionProfile(record: {
  id: string
  schemaVersion: string
  correlationId: string
  externalIntegrationProfileId: string | null
  name: string
  profileMode: string
  connectionState: string
  status: string
  serverMetadataJson: string | null
  authMetadataJson: string
  canConnect: boolean
  canInvokeTool: boolean
  canListTools: boolean
  canReadResources: boolean
  canWriteResources: boolean
  sourceEvidenceRefsJson: string | null
  sourceRedactionStatus: string
  riskLevel: string
  requiresHumanConfirmation: boolean
  createdBy: string
  reviewedBy: string | null
  reviewedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}): McpConnectionProfile {
  return {
    id: record.id,
    schemaVersion: record.schemaVersion,
    correlationId: record.correlationId,
    externalIntegrationProfileId: record.externalIntegrationProfileId ?? undefined,
    name: record.name,
    profileMode: 'disabled_local_record',
    connectionState: 'not_connected',
    status: record.status as McpConnectionProfile['status'],
    serverMetadata: decodeJson(record.serverMetadataJson, undefined),
    authMetadata: decodeJson(record.authMetadataJson, { authType: 'unknown', storesSecrets: false }),
    canConnect: false,
    canInvokeTool: false,
    canListTools: false,
    canReadResources: false,
    canWriteResources: false,
    sourceEvidenceRefs: decodeJson(record.sourceEvidenceRefsJson, undefined),
    sourceRedactionStatus: record.sourceRedactionStatus as McpConnectionProfile['sourceRedactionStatus'],
    riskLevel: record.riskLevel as McpConnectionProfile['riskLevel'],
    requiresHumanConfirmation: record.requiresHumanConfirmation,
    createdBy: record.createdBy as McpConnectionProfile['createdBy'],
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: dateToString(record.reviewedAt),
    rejectionReason: record.rejectionReason ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeExternalActionProposal(record: {
  id: string
  schemaVersion: string
  correlationId: string
  taskId: string | null
  agentRunId: string | null
  toolRunId: string | null
  toolExecutionReceiptId: string | null
  collaborationDecisionId: string | null
  fileChangeProposalId: string | null
  pullRequestPlanId: string | null
  externalIntegrationProfileId: string | null
  mcpConnectionProfileId: string | null
  sourceKind: string
  sourceEvidenceRefsJson: string
  sourceSnapshotJson: string | null
  sourceRedactionStatus: string
  status: string
  actionCategory: string
  title: string
  summary: string
  proposedIntent: string
  proposedPayloadSummary: string | null
  endpointMetadataRef: string | null
  dataClassification: string
  riskAssessmentId: string | null
  riskLevel: string
  requiresHumanConfirmation: boolean
  confirmationArtifactId: string | null
  createdBy: string
  reviewedBy: string | null
  reviewedAt: Date | null
  rejectionReason: string | null
  supersededById: string | null
  createdAt: Date
  updatedAt: Date
}): ExternalActionProposal {
  return {
    id: record.id,
    schemaVersion: record.schemaVersion,
    correlationId: record.correlationId,
    taskId: record.taskId ?? undefined,
    agentRunId: record.agentRunId ?? undefined,
    toolRunId: record.toolRunId ?? undefined,
    toolExecutionReceiptId: record.toolExecutionReceiptId ?? undefined,
    collaborationDecisionId: record.collaborationDecisionId ?? undefined,
    fileChangeProposalId: record.fileChangeProposalId ?? undefined,
    pullRequestPlanId: record.pullRequestPlanId ?? undefined,
    externalIntegrationProfileId: record.externalIntegrationProfileId ?? undefined,
    mcpConnectionProfileId: record.mcpConnectionProfileId ?? undefined,
    sourceKind: record.sourceKind as ExternalActionProposal['sourceKind'],
    sourceEvidenceRefs: decodeJson(record.sourceEvidenceRefsJson, []),
    sourceSnapshot: decodeJson(record.sourceSnapshotJson, undefined),
    sourceRedactionStatus: record.sourceRedactionStatus as ExternalActionProposal['sourceRedactionStatus'],
    status: record.status as ExternalActionProposal['status'],
    actionCategory: record.actionCategory as ExternalActionProposal['actionCategory'],
    title: record.title,
    summary: record.summary,
    proposedIntent: record.proposedIntent,
    proposedPayloadSummary: record.proposedPayloadSummary ?? undefined,
    endpointMetadataRef: record.endpointMetadataRef ?? undefined,
    dataClassification: record.dataClassification as ExternalActionProposal['dataClassification'],
    riskAssessmentId: record.riskAssessmentId ?? undefined,
    canCallExternalApi: false,
    canConnectMcp: false,
    canSendNetworkRequest: false,
    canCreateWebhook: false,
    canCreateWorker: false,
    canCreateQueue: false,
    canSendMessage: false,
    canReadExternalData: false,
    canWriteExternalData: false,
    canExecuteToolRun: false,
    canStartAgent: false,
    canCompleteTask: false,
    riskLevel: record.riskLevel as ExternalActionProposal['riskLevel'],
    requiresHumanConfirmation: record.requiresHumanConfirmation,
    confirmationArtifactId: record.confirmationArtifactId ?? undefined,
    createdBy: record.createdBy as ExternalActionProposal['createdBy'],
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: dateToString(record.reviewedAt),
    rejectionReason: record.rejectionReason ?? undefined,
    supersededById: record.supersededById ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeExternalActionReviewRecord(record: {
  id: string
  schemaVersion: string
  correlationId: string
  externalActionProposalId: string
  riskAssessmentId: string | null
  confirmationArtifactId: string | null
  status: string
  reviewer: string
  verdict: string
  rationale: string
  requiredFollowUpsJson: string | null
  evidenceRefsJson: string | null
  createdAt: Date
  updatedAt: Date
}): ExternalActionReviewRecord {
  return {
    id: record.id,
    schemaVersion: record.schemaVersion,
    correlationId: record.correlationId,
    externalActionProposalId: record.externalActionProposalId,
    riskAssessmentId: record.riskAssessmentId ?? undefined,
    confirmationArtifactId: record.confirmationArtifactId ?? undefined,
    status: record.status as ExternalActionReviewRecord['status'],
    reviewer: record.reviewer as ExternalActionReviewRecord['reviewer'],
    verdict: record.verdict as ExternalActionReviewRecord['verdict'],
    rationale: record.rationale,
    requiredFollowUps: decodeJson(record.requiredFollowUpsJson, undefined),
    evidenceRefs: decodeJson(record.evidenceRefsJson, undefined),
    canExecute: false,
    canCallExternalApi: false,
    canConnectMcp: false,
    canSendMessage: false,
    canCreateWebhook: false,
    canCreateWorker: false,
    canCreateQueue: false,
    canCompleteTask: false,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeIntegrationRiskAssessment(record: {
  id: string
  schemaVersion: string
  correlationId: string
  targetType: string
  targetId: string
  status: string
  riskLevel: string
  riskFactorsJson: string
  recommendation: string
  evidenceRefsJson: string | null
  reviewedBy: string | null
  reviewedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): IntegrationRiskAssessment {
  return {
    id: record.id,
    schemaVersion: record.schemaVersion,
    correlationId: record.correlationId,
    targetType: record.targetType as IntegrationRiskAssessment['targetType'],
    targetId: record.targetId,
    status: record.status as IntegrationRiskAssessment['status'],
    riskLevel: record.riskLevel as IntegrationRiskAssessment['riskLevel'],
    riskFactors: decodeJson(record.riskFactorsJson, []),
    recommendation: record.recommendation as IntegrationRiskAssessment['recommendation'],
    evidenceRefs: decodeJson(record.evidenceRefsJson, undefined),
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: dateToString(record.reviewedAt),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeIntegrationAuditPolicy(record: {
  id: string
  policyVersion: string
  correlationId: string
  targetSprint: string
  requiredAuditEventsJson: string
  requiredObservabilityEventsJson: string
  requiredRedactionChecksJson: string
  forbiddenPayloadFieldsJson: string
  blockedPayloadSurfacesJson: string
  createdAt: Date
  updatedAt: Date
}): IntegrationAuditPolicy {
  return {
    id: record.id,
    policyVersion: record.policyVersion,
    correlationId: record.correlationId,
    targetSprint: 'sprint_13',
    requiredAuditEvents: decodeJson(record.requiredAuditEventsJson, []),
    requiredObservabilityEvents: decodeJson(record.requiredObservabilityEventsJson, []),
    requiredRedactionChecks: decodeJson(record.requiredRedactionChecksJson, []),
    forbiddenPayloadFields: decodeJson(record.forbiddenPayloadFieldsJson, []),
    blockedPayloadSurfaces: decodeJson(record.blockedPayloadSurfacesJson, []),
    allowRawExternalPayload: false,
    allowSecretsInMetadata: false,
    allowWebhookDispatch: false,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
