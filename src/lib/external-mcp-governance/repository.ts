import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { encodeJson } from '@/lib/harmony/serializers'
import { createObservabilityEvent } from '@/lib/observability/repository'
import type { ToolResult } from '@/lib/tools/types'
import {
  assertNoExecutionCapabilities,
  eventTypeForResource,
  sanitizeEndpointMetadata,
  sanitizeGovernanceSnapshot,
  validateExternalActionProposalDraft,
  validateExternalIntegrationProfileDraft,
  validateMcpConnectionProfileDraft,
} from './rules'
import {
  serializeExternalActionProposal,
  serializeExternalActionReviewRecord,
  serializeExternalIntegrationProfile,
  serializeIntegrationAuditPolicy,
  serializeIntegrationRiskAssessment,
  serializeMcpConnectionProfile,
} from './serializers'
import { transitionExternalMcpRecord } from './state-machine'
import type {
  EndpointMetadata,
  ExternalActionProposal,
  ExternalActionReviewRecord,
  ExternalActionSourceKind,
  ExternalIntegrationProfile,
  ExternalMcpEvent,
  ExternalMcpRiskLevel,
  IntegrationRiskAssessment,
  McpConnectionProfile,
  SourceRedactionStatus,
} from './types'

type RawExternalIntegrationProfile = Parameters<typeof serializeExternalIntegrationProfile>[0]
type RawMcpConnectionProfile = Parameters<typeof serializeMcpConnectionProfile>[0]
type RawExternalActionProposal = Parameters<typeof serializeExternalActionProposal>[0]
type RawExternalActionReviewRecord = Parameters<typeof serializeExternalActionReviewRecord>[0]
type RawIntegrationRiskAssessment = Parameters<typeof serializeIntegrationRiskAssessment>[0]
type RawIntegrationAuditPolicy = Parameters<typeof serializeIntegrationAuditPolicy>[0]

const schemaVersion = 'sprint-13.0'

export class ExternalMcpGovernanceRepositoryError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
    this.name = 'ExternalMcpGovernanceRepositoryError'
  }
}

export const sprint13RequiredAuditEvents = [
  'external_integration_profile.created',
  'external_integration_profile.submitted_for_review',
  'external_integration_profile.approved_record',
  'external_integration_profile.rejected',
  'external_integration_profile.archived',
  'mcp_connection_profile.created',
  'mcp_connection_profile.submitted_for_review',
  'mcp_connection_profile.approved_record',
  'mcp_connection_profile.rejected',
  'mcp_connection_profile.archived',
  'external_action.proposal_created',
  'external_action.submitted_for_review',
  'external_action.approved_record',
  'external_action.rejected',
  'external_action.superseded',
  'external_action.archived',
  'integration_risk.assessment_created',
  'integration_risk.approved_record',
  'integration_risk.rejected',
  'external_action_review.created',
  'external_action_review.approved_record',
  'external_action_review.rejected',
  'external_action_review.archived',
  'integration_audit_policy.recorded',
]

export async function createExternalIntegrationProfile(input: {
  name: string
  providerType?: ExternalIntegrationProfile['providerType']
  endpointMetadata?: EndpointMetadata
  authMetadata?: ExternalIntegrationProfile['authMetadata']
  sourceEvidenceRefs?: string[]
  sourceRedactionStatus?: SourceRedactionStatus
  riskLevel?: ExternalMcpRiskLevel
  createdBy?: ExternalIntegrationProfile['createdBy']
}) {
  const endpointMetadata = sanitizeEndpointMetadata(input.endpointMetadata)
  const authMetadata = input.authMetadata ?? { authType: 'unknown', storesSecrets: false }
  const draft = {
    name: input.name,
    endpointMetadata,
    authMetadata,
    sourceRedactionStatus: input.sourceRedactionStatus ?? 'not_required',
  }
  validateExternalIntegrationProfileDraft(draft)

  const id = randomUUID()
  const correlationId = `sprint13:${id}`
  await prisma.$executeRaw`
    INSERT INTO external_integration_profiles (
      id, schemaVersion, correlationId, name, providerType, status, endpointMetadataJson,
      authMetadataJson, allowedRecordActionsJson, forbiddenActionsJson, riskLevel,
      requiresHumanConfirmation, sourceEvidenceRefsJson, sourceRedactionStatus,
      createdBy, reviewedBy, reviewedAt, rejectionReason, createdAt, updatedAt
    ) VALUES (
      ${id}, ${schemaVersion}, ${correlationId}, ${input.name}, ${input.providerType ?? 'generic_http'},
      ${'proposal'}, ${endpointMetadata ? encodeJson(endpointMetadata) : null}, ${encodeJson(authMetadata)},
      ${encodeJson(['create_external_action_proposal', 'create_risk_assessment', 'submit_review', 'approve_record', 'reject', 'archive'])},
      ${encodeJson(['call_external_api', 'connect_mcp', 'send_network_request', 'create_webhook', 'create_worker', 'create_queue', 'send_message', 'read_external_data', 'write_external_data', 'execute_toolrun', 'start_agent', 'complete_task'])},
      ${input.riskLevel ?? 'medium'}, ${true}, ${encodeJson(input.sourceEvidenceRefs ?? [])},
      ${input.sourceRedactionStatus ?? 'not_required'}, ${input.createdBy ?? 'human'},
      ${null}, ${null}, ${null}, ${new Date()}, ${new Date()}
    )
  `
  const auditEvents = await audit({
    correlationId,
    eventType: 'external_integration_profile.created',
    actorType: actorType(input.createdBy),
    afterStatus: 'proposal',
    reason: 'ExternalIntegrationProfile local governance record created. No endpoint was dereferenced.',
    payload: { externalIntegrationProfileId: id, localRecordOnly: true, allowWebhookDispatch: false },
  })
  const observabilityEvents = [await observe(correlationId, 'external_integration_profile', id, 'external_integration_profile.created', 'ExternalIntegrationProfile local governance record created.')]
  return { externalIntegrationProfile: await mustGetExternalIntegrationProfile(id), auditEvents, observabilityEvents }
}

export async function listExternalIntegrationProfiles(filters: { status?: string; providerType?: string } = {}) {
  const rows = await prisma.$queryRaw<RawExternalIntegrationProfile[]>`
    SELECT * FROM external_integration_profiles
    WHERE (${filters.status ?? null} IS NULL OR status = ${filters.status ?? null})
      AND (${filters.providerType ?? null} IS NULL OR providerType = ${filters.providerType ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeExternalIntegrationProfile)
}

export async function getExternalIntegrationProfile(id: string) {
  const rows = await prisma.$queryRaw<RawExternalIntegrationProfile[]>`
    SELECT * FROM external_integration_profiles WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeExternalIntegrationProfile(rows[0]) : null
}

export async function updateExternalIntegrationProfileStatus(id: string, event: ExternalMcpEvent, reason: string) {
  const profile = await mustGetExternalIntegrationProfile(id)
  const nextStatus = transitionExternalMcpRecord(profile.status, event)
  await updateStatus('external_integration_profiles', id, nextStatus, reason)
  return statusResult('external_integration_profile', id, profile.correlationId, profile.status, nextStatus, reason)
}

export async function createMcpConnectionProfile(input: {
  name: string
  externalIntegrationProfileId?: string
  serverMetadata?: McpConnectionProfile['serverMetadata']
  authMetadata?: McpConnectionProfile['authMetadata']
  sourceEvidenceRefs?: string[]
  sourceRedactionStatus?: SourceRedactionStatus
  riskLevel?: ExternalMcpRiskLevel
  createdBy?: McpConnectionProfile['createdBy']
}) {
  const authMetadata = input.authMetadata ?? { authType: 'unknown', storesSecrets: false }
  validateMcpConnectionProfileDraft({
    name: input.name,
    profileMode: 'disabled_local_record',
    connectionState: 'not_connected',
    serverMetadata: input.serverMetadata,
    authMetadata,
  })
  const id = randomUUID()
  const correlationId = `sprint13:${id}`
  await prisma.$executeRaw`
    INSERT INTO mcp_connection_profiles (
      id, schemaVersion, correlationId, externalIntegrationProfileId, name, profileMode,
      connectionState, status, serverMetadataJson, authMetadataJson, canConnect,
      canInvokeTool, canListTools, canReadResources, canWriteResources, sourceEvidenceRefsJson,
      sourceRedactionStatus, riskLevel, requiresHumanConfirmation, createdBy, reviewedBy,
      reviewedAt, rejectionReason, createdAt, updatedAt
    ) VALUES (
      ${id}, ${schemaVersion}, ${correlationId}, ${input.externalIntegrationProfileId ?? null},
      ${input.name}, ${'disabled_local_record'}, ${'not_connected'}, ${'proposal'},
      ${input.serverMetadata ? encodeJson(input.serverMetadata) : null}, ${encodeJson(authMetadata)},
      ${false}, ${false}, ${false}, ${false}, ${false}, ${encodeJson(input.sourceEvidenceRefs ?? [])},
      ${input.sourceRedactionStatus ?? 'not_required'}, ${input.riskLevel ?? 'high'}, ${true},
      ${input.createdBy ?? 'human'}, ${null}, ${null}, ${null}, ${new Date()}, ${new Date()}
    )
  `
  const auditEvents = await audit({
    correlationId,
    eventType: 'mcp_connection_profile.created',
    actorType: actorType(input.createdBy),
    afterStatus: 'proposal',
    reason: 'McpConnectionProfile disabled local record created. No MCP session was created.',
    payload: { mcpConnectionProfileId: id, profileMode: 'disabled_local_record', connectionState: 'not_connected' },
  })
  return { mcpConnectionProfile: await mustGetMcpConnectionProfile(id), auditEvents, observabilityEvents: [await observe(correlationId, 'mcp_connection_profile', id, 'mcp_connection_profile.created', 'MCP disabled local record created.')] }
}

export async function listMcpConnectionProfiles(filters: { status?: string; externalIntegrationProfileId?: string } = {}) {
  const rows = await prisma.$queryRaw<RawMcpConnectionProfile[]>`
    SELECT * FROM mcp_connection_profiles
    WHERE (${filters.status ?? null} IS NULL OR status = ${filters.status ?? null})
      AND (${filters.externalIntegrationProfileId ?? null} IS NULL OR externalIntegrationProfileId = ${filters.externalIntegrationProfileId ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeMcpConnectionProfile)
}

export async function getMcpConnectionProfile(id: string) {
  const rows = await prisma.$queryRaw<RawMcpConnectionProfile[]>`
    SELECT * FROM mcp_connection_profiles WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeMcpConnectionProfile(rows[0]) : null
}

export async function updateMcpConnectionProfileStatus(id: string, event: ExternalMcpEvent, reason: string) {
  const profile = await mustGetMcpConnectionProfile(id)
  const nextStatus = transitionExternalMcpRecord(profile.status, event)
  await updateStatus('mcp_connection_profiles', id, nextStatus, reason)
  return statusResult('mcp_connection_profile', id, profile.correlationId, profile.status, nextStatus, reason)
}

export async function createExternalActionProposal(input: {
  sourceKind: ExternalActionSourceKind
  sourceId?: string
  sourceEvidenceRefs?: string[]
  sourceSnapshot?: unknown
  sourceRedactionStatus?: SourceRedactionStatus
  taskId?: string
  agentRunId?: string
  toolRunId?: string
  toolExecutionReceiptId?: string
  collaborationDecisionId?: string
  fileChangeProposalId?: string
  pullRequestPlanId?: string
  externalIntegrationProfileId?: string
  mcpConnectionProfileId?: string
  actionCategory?: ExternalActionProposal['actionCategory']
  title: string
  summary: string
  proposedIntent: string
  proposedPayloadSummary?: string
  endpointMetadataRef?: string
  dataClassification?: ExternalActionProposal['dataClassification']
  riskLevel?: ExternalMcpRiskLevel
  createdBy?: ExternalActionProposal['createdBy']
}) {
  const sourceSnapshot = input.sourceRedactionStatus === 'blocked'
    ? undefined
    : input.sourceSnapshot === undefined
      ? undefined
      : sanitizeGovernanceSnapshot(input.sourceSnapshot)
  validateExternalActionProposalDraft({
    sourceKind: input.sourceKind,
    sourceSnapshot,
    sourceRedactionStatus: input.sourceRedactionStatus ?? 'not_required',
    title: input.title,
    summary: input.summary,
    proposedIntent: input.proposedIntent,
    proposedPayloadSummary: input.proposedPayloadSummary,
  })
  assertNoExecutionCapabilities({
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
  })
  const id = randomUUID()
  const correlationId = `sprint13:${id}`
  await prisma.$executeRaw`
    INSERT INTO external_action_proposals (
      id, schemaVersion, correlationId, taskId, agentRunId, toolRunId, toolExecutionReceiptId,
      collaborationDecisionId, fileChangeProposalId, pullRequestPlanId, externalIntegrationProfileId,
      mcpConnectionProfileId, sourceKind, sourceEvidenceRefsJson, sourceSnapshotJson,
      sourceRedactionStatus, status, actionCategory, title, summary, proposedIntent,
      proposedPayloadSummary, endpointMetadataRef, dataClassification, riskAssessmentId,
      canCallExternalApi, canConnectMcp, canSendNetworkRequest, canCreateWebhook, canCreateWorker,
      canCreateQueue, canSendMessage, canReadExternalData, canWriteExternalData, canExecuteToolRun,
      canStartAgent, canCompleteTask, riskLevel, requiresHumanConfirmation, confirmationArtifactId,
      createdBy, reviewedBy, reviewedAt, rejectionReason, supersededById, createdAt, updatedAt
    ) VALUES (
      ${id}, ${schemaVersion}, ${correlationId}, ${input.taskId ?? null}, ${input.agentRunId ?? null},
      ${input.toolRunId ?? null}, ${input.toolExecutionReceiptId ?? null}, ${input.collaborationDecisionId ?? null},
      ${input.fileChangeProposalId ?? null}, ${input.pullRequestPlanId ?? null}, ${input.externalIntegrationProfileId ?? null},
      ${input.mcpConnectionProfileId ?? null}, ${input.sourceKind}, ${encodeJson(input.sourceEvidenceRefs ?? [])},
      ${sourceSnapshot === undefined ? null : encodeJson(sourceSnapshot)}, ${input.sourceRedactionStatus ?? 'not_required'},
      ${'proposal'}, ${input.actionCategory ?? 'other'}, ${input.title}, ${input.summary}, ${input.proposedIntent},
      ${input.proposedPayloadSummary ?? null}, ${input.endpointMetadataRef ?? null}, ${input.dataClassification ?? 'unknown'},
      ${null}, ${false}, ${false}, ${false}, ${false}, ${false}, ${false}, ${false}, ${false}, ${false},
      ${false}, ${false}, ${false}, ${input.riskLevel ?? 'medium'}, ${true}, ${null}, ${input.createdBy ?? 'human'},
      ${null}, ${null}, ${null}, ${null}, ${new Date()}, ${new Date()}
    )
  `
  const auditEvents = await audit({
    correlationId,
    taskId: input.taskId,
    eventType: 'external_action.proposal_created',
    actorType: actorType(input.createdBy),
    afterStatus: 'proposal',
    reason: 'ExternalActionProposal local governance record created. No endpoint was dereferenced and no external action was executed.',
    payload: { externalActionProposalId: id, sourceKind: input.sourceKind, localRecordOnly: true },
  })
  return { externalActionProposal: await mustGetExternalActionProposal(id), auditEvents, observabilityEvents: [await observe(correlationId, 'external_action_proposal', id, 'external_action.proposal_created', 'ExternalActionProposal local governance record created.')] }
}

export async function createExternalActionProposalFromAgentResult(agentRunId: string, input: ExternalProposalDefaults = {}) {
  const run = await findAgentRun(agentRunId)
  if (!run) throw new ExternalMcpGovernanceRepositoryError('AgentRun not found.', 404)
  return createExternalActionProposal({
    sourceKind: 'agent_result',
    sourceEvidenceRefs: [`agent_run:${agentRunId}`],
    sourceSnapshot: safeJson(run.resultJson, { agentRunId }),
    taskId: run.taskId,
    agentRunId,
    ...defaultExternalProposalInput('External proposal from AgentResult', input),
  })
}

export async function createExternalActionProposalFromToolResult(toolRunId: string, input: ExternalProposalDefaults = {}) {
  const run = await findToolRun(toolRunId)
  if (!run) throw new ExternalMcpGovernanceRepositoryError('ToolRun not found.', 404)
  const result = safeJson<ToolResult | undefined>(run.resultJson, undefined)
  return createExternalActionProposal({
    sourceKind: 'tool_result',
    sourceEvidenceRefs: [`tool_run:${toolRunId}`],
    sourceSnapshot: { toolRunId, status: run.status, mode: run.mode, resultSummary: result?.summary, sideEffects: result?.sideEffects ?? [] },
    taskId: run.taskId ?? undefined,
    agentRunId: run.agentRunId ?? undefined,
    toolRunId,
    ...defaultExternalProposalInput('External proposal from ToolResult', input),
  })
}

export async function createExternalActionProposalFromToolExecutionReceipt(receiptId: string, input: ExternalProposalDefaults = {}) {
  const receipt = await findToolExecutionReceipt(receiptId)
  if (!receipt) throw new ExternalMcpGovernanceRepositoryError('ToolExecutionReceipt not found.', 404)
  return createExternalActionProposal({
    sourceKind: 'tool_execution_receipt',
    sourceEvidenceRefs: [`tool_execution_receipt:${receiptId}`, `tool_run:${receipt.toolRunId}`],
    sourceSnapshot: { receiptId, toolRunId: receipt.toolRunId, status: receipt.status, resultSummary: receipt.resultSummary, sideEffectClass: receipt.sideEffectClass, outputHash: receipt.outputHash },
    taskId: receipt.taskId ?? undefined,
    agentRunId: receipt.agentRunId ?? undefined,
    toolRunId: receipt.toolRunId,
    toolExecutionReceiptId: receiptId,
    ...defaultExternalProposalInput('External proposal from ToolExecutionReceipt', input),
  })
}

export async function createExternalActionProposalFromCollaborationDecision(decisionId: string, input: ExternalProposalDefaults = {}) {
  const decision = await findCollaborationDecision(decisionId)
  if (!decision) throw new ExternalMcpGovernanceRepositoryError('CollaborationDecision not found.', 404)
  return createExternalActionProposal({
    sourceKind: 'collaboration_decision',
    sourceEvidenceRefs: [`collaboration_decision:${decisionId}`],
    sourceSnapshot: { collaborationDecisionId: decision.id, status: decision.status, title: decision.title, recommendation: decision.recommendation },
    taskId: decision.taskId ?? undefined,
    collaborationDecisionId: decisionId,
    ...defaultExternalProposalInput('External proposal from CollaborationDecision', input),
  })
}

export async function createExternalActionProposalFromFileChangeProposal(fileChangeProposalId: string, input: ExternalProposalDefaults = {}) {
  const proposal = await findFileChangeProposal(fileChangeProposalId)
  if (!proposal) throw new ExternalMcpGovernanceRepositoryError('FileChangeProposal not found.', 404)
  return createExternalActionProposal({
    sourceKind: 'file_change_proposal',
    sourceEvidenceRefs: [`file_change_proposal:${fileChangeProposalId}`],
    sourceSnapshot: { fileChangeProposalId, status: proposal.status, title: proposal.title, summary: proposal.summary },
    taskId: proposal.taskId ?? undefined,
    fileChangeProposalId,
    ...defaultExternalProposalInput('External proposal from FileChangeProposal', input),
  })
}

export async function createExternalActionProposalFromPullRequestPlan(pullRequestPlanId: string, input: ExternalProposalDefaults = {}) {
  const plan = await findPullRequestPlan(pullRequestPlanId)
  if (!plan) throw new ExternalMcpGovernanceRepositoryError('PullRequestPlan not found.', 404)
  return createExternalActionProposal({
    sourceKind: 'pull_request_plan',
    sourceEvidenceRefs: [`pull_request_plan:${pullRequestPlanId}`],
    sourceSnapshot: { pullRequestPlanId, status: plan.status, title: plan.title, summary: plan.summary },
    pullRequestPlanId,
    ...defaultExternalProposalInput('External proposal from PullRequestPlan', input),
  })
}

export async function createExternalActionProposalFromUserSnippet(input: ExternalProposalDefaults & { userSnippet?: unknown }) {
  return createExternalActionProposal({
    sourceKind: 'user_provided_snippet',
    sourceEvidenceRefs: ['user_provided_snippet'],
    sourceSnapshot: input.userSnippet ? { snippet: input.userSnippet } : undefined,
    ...defaultExternalProposalInput('External proposal from user snippet', input),
  })
}

export async function listExternalActionProposals(filters: {
  taskId?: string
  agentRunId?: string
  toolRunId?: string
  toolExecutionReceiptId?: string
  collaborationDecisionId?: string
  fileChangeProposalId?: string
  pullRequestPlanId?: string
  status?: string
} = {}) {
  const rows = await prisma.$queryRaw<RawExternalActionProposal[]>`
    SELECT * FROM external_action_proposals
    WHERE (${filters.taskId ?? null} IS NULL OR taskId = ${filters.taskId ?? null})
      AND (${filters.agentRunId ?? null} IS NULL OR agentRunId = ${filters.agentRunId ?? null})
      AND (${filters.toolRunId ?? null} IS NULL OR toolRunId = ${filters.toolRunId ?? null})
      AND (${filters.toolExecutionReceiptId ?? null} IS NULL OR toolExecutionReceiptId = ${filters.toolExecutionReceiptId ?? null})
      AND (${filters.collaborationDecisionId ?? null} IS NULL OR collaborationDecisionId = ${filters.collaborationDecisionId ?? null})
      AND (${filters.fileChangeProposalId ?? null} IS NULL OR fileChangeProposalId = ${filters.fileChangeProposalId ?? null})
      AND (${filters.pullRequestPlanId ?? null} IS NULL OR pullRequestPlanId = ${filters.pullRequestPlanId ?? null})
      AND (${filters.status ?? null} IS NULL OR status = ${filters.status ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeExternalActionProposal)
}

export async function getExternalActionProposal(id: string) {
  const rows = await prisma.$queryRaw<RawExternalActionProposal[]>`
    SELECT * FROM external_action_proposals WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeExternalActionProposal(rows[0]) : null
}

export async function updateExternalActionProposalStatus(id: string, event: ExternalMcpEvent, reason: string) {
  const proposal = await mustGetExternalActionProposal(id)
  const nextStatus = transitionExternalMcpRecord(proposal.status, event)
  await updateStatus('external_action_proposals', id, nextStatus, reason)
  return statusResult('external_action_proposal', id, proposal.correlationId, proposal.status, nextStatus, reason, proposal.taskId)
}

export async function createIntegrationRiskAssessment(input: {
  targetType: IntegrationRiskAssessment['targetType']
  targetId: string
  riskLevel?: ExternalMcpRiskLevel
  riskFactors?: IntegrationRiskAssessment['riskFactors']
  recommendation?: IntegrationRiskAssessment['recommendation']
  evidenceRefs?: string[]
}) {
  const id = randomUUID()
  const correlationId = `sprint13:${id}`
  await prisma.$executeRaw`
    INSERT INTO integration_risk_assessments (
      id, schemaVersion, correlationId, targetType, targetId, status, riskLevel,
      riskFactorsJson, recommendation, evidenceRefsJson, reviewedBy, reviewedAt, createdAt, updatedAt
    ) VALUES (
      ${id}, ${schemaVersion}, ${correlationId}, ${input.targetType}, ${input.targetId},
      ${'draft'}, ${input.riskLevel ?? 'medium'}, ${encodeJson(input.riskFactors ?? [])},
      ${input.recommendation ?? 'requires_kelvin_review'}, ${encodeJson(input.evidenceRefs ?? [])},
      ${null}, ${null}, ${new Date()}, ${new Date()}
    )
  `
  const auditEvents = await audit({
    correlationId,
    eventType: 'integration_risk.assessment_created',
    actorType: 'system',
    afterStatus: 'draft',
    reason: 'IntegrationRiskAssessment local recommendation record created. No external verification was performed.',
    payload: { integrationRiskAssessmentId: id, targetType: input.targetType, targetId: input.targetId },
  })
  return { integrationRiskAssessment: await mustGetIntegrationRiskAssessment(id), auditEvents, observabilityEvents: [await observe(correlationId, 'integration_risk_assessment', id, 'integration_risk.assessment_created', 'IntegrationRiskAssessment local record created.')] }
}

export async function listIntegrationRiskAssessments(filters: { targetType?: string; targetId?: string } = {}) {
  const rows = await prisma.$queryRaw<RawIntegrationRiskAssessment[]>`
    SELECT * FROM integration_risk_assessments
    WHERE (${filters.targetType ?? null} IS NULL OR targetType = ${filters.targetType ?? null})
      AND (${filters.targetId ?? null} IS NULL OR targetId = ${filters.targetId ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeIntegrationRiskAssessment)
}

export async function getIntegrationRiskAssessment(id: string) {
  const rows = await prisma.$queryRaw<RawIntegrationRiskAssessment[]>`
    SELECT * FROM integration_risk_assessments WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeIntegrationRiskAssessment(rows[0]) : null
}

export async function createExternalActionReviewRecord(input: {
  externalActionProposalId: string
  riskAssessmentId?: string
  reviewer?: ExternalActionReviewRecord['reviewer']
  verdict?: ExternalActionReviewRecord['verdict']
  rationale: string
  requiredFollowUps?: string[]
  evidenceRefs?: string[]
}) {
  const proposal = await mustGetExternalActionProposal(input.externalActionProposalId)
  const id = randomUUID()
  await prisma.$executeRaw`
    INSERT INTO external_action_review_records (
      id, schemaVersion, correlationId, externalActionProposalId, riskAssessmentId,
      confirmationArtifactId, status, reviewer, verdict, rationale, requiredFollowUpsJson,
      evidenceRefsJson, canExecute, canCallExternalApi, canConnectMcp, canSendMessage,
      canCreateWebhook, canCreateWorker, canCreateQueue, canCompleteTask, createdAt, updatedAt
    ) VALUES (
      ${id}, ${schemaVersion}, ${proposal.correlationId}, ${proposal.id}, ${input.riskAssessmentId ?? null},
      ${null}, ${'review'}, ${input.reviewer ?? 'kelvin'}, ${input.verdict ?? 'request_changes'},
      ${input.rationale}, ${encodeJson(input.requiredFollowUps ?? [])}, ${encodeJson(input.evidenceRefs ?? [])},
      ${false}, ${false}, ${false}, ${false}, ${false}, ${false}, ${false}, ${false}, ${new Date()}, ${new Date()}
    )
  `
  const auditEvents = await audit({
    correlationId: proposal.correlationId,
    taskId: proposal.taskId,
    eventType: 'external_action_review.created',
    actorType: input.reviewer === 'kelvin' ? 'kelvin' : 'user',
    afterStatus: 'review',
    reason: 'ExternalActionReviewRecord local review created. It cannot execute external actions.',
    payload: { externalActionReviewRecordId: id, externalActionProposalId: proposal.id, localRecordOnly: true },
  })
  return { externalActionReviewRecord: await mustGetExternalActionReviewRecord(id), auditEvents, observabilityEvents: [await observe(proposal.correlationId, 'external_action_review_record', id, 'external_action_review.created', 'ExternalActionReviewRecord local review created.')] }
}

export async function listExternalActionReviewRecords(filters: { externalActionProposalId?: string } = {}) {
  const rows = await prisma.$queryRaw<RawExternalActionReviewRecord[]>`
    SELECT * FROM external_action_review_records
    WHERE (${filters.externalActionProposalId ?? null} IS NULL OR externalActionProposalId = ${filters.externalActionProposalId ?? null})
    ORDER BY createdAt DESC
  `
  return rows.map(serializeExternalActionReviewRecord)
}

export async function getExternalActionReviewRecord(id: string) {
  const rows = await prisma.$queryRaw<RawExternalActionReviewRecord[]>`
    SELECT * FROM external_action_review_records WHERE id = ${id} LIMIT 1
  `
  return rows[0] ? serializeExternalActionReviewRecord(rows[0]) : null
}

export async function updateExternalActionReviewRecordStatus(id: string, event: Extract<ExternalMcpEvent, 'APPROVE_RECORD' | 'REJECT' | 'ARCHIVE'>, reason: string) {
  const review = await mustGetExternalActionReviewRecord(id)
  const nextStatus = transitionExternalMcpRecord(review.status, event)
  await prisma.$executeRaw`
    UPDATE external_action_review_records SET status = ${nextStatus}, updatedAt = ${new Date()} WHERE id = ${id}
  `
  const auditEvents = await audit({
    correlationId: review.correlationId,
    eventType: eventTypeForResource('external_action_review_record', nextStatus),
    actorType: 'kelvin',
    beforeStatus: review.status,
    afterStatus: nextStatus,
    reason: `${reason} Review approval is local only and cannot call external APIs, connect MCP, dispatch webhooks, or complete Tasks.`,
    payload: { externalActionReviewRecordId: id, localRecordOnly: true },
  })
  return { externalActionReviewRecord: await mustGetExternalActionReviewRecord(id), auditEvents, observabilityEvents: [await observe(review.correlationId, 'external_action_review_record', id, eventTypeForResource('external_action_review_record', nextStatus), reason)] }
}

export async function getIntegrationAuditPolicy() {
  const id = 'integration-audit-policy-sprint-13'
  const rows = await prisma.$queryRaw<RawIntegrationAuditPolicy[]>`
    SELECT * FROM integration_audit_policies WHERE id = ${id} LIMIT 1
  `
  if (rows[0]) return serializeIntegrationAuditPolicy(rows[0])
  await prisma.$executeRaw`
    INSERT INTO integration_audit_policies (
      id, policyVersion, correlationId, targetSprint, requiredAuditEventsJson,
      requiredObservabilityEventsJson, requiredRedactionChecksJson, forbiddenPayloadFieldsJson,
      blockedPayloadSurfacesJson, allowRawExternalPayload, allowSecretsInMetadata,
      allowWebhookDispatch, createdAt, updatedAt
    ) VALUES (
      ${id}, ${'sprint-13.0'}, ${'sprint13:audit-policy'}, ${'sprint_13'},
      ${encodeJson(sprint13RequiredAuditEvents)}, ${encodeJson(['external_mcp_governance.recorded'])},
      ${encodeJson(['no_secrets', 'no_raw_external_payload', 'no_webhook_dispatch'])},
      ${encodeJson(['headers', 'authorization', 'cookie', 'token', 'credentials', 'rawPayload'])},
      ${encodeJson(['audit_detail', 'observability_detail', 'recovery_point', 'run_journal', 'resume_token', 'eval_evidence', 'agent_prompt', 'external_action_proposal', 'integration_profile', 'mcp_profile'])},
      ${false}, ${false}, ${false}, ${new Date()}, ${new Date()}
    )
  `
  const created = await prisma.$queryRaw<RawIntegrationAuditPolicy[]>`
    SELECT * FROM integration_audit_policies WHERE id = ${id} LIMIT 1
  `
  return serializeIntegrationAuditPolicy(created[0])
}

async function mustGetExternalIntegrationProfile(id: string) {
  const record = await getExternalIntegrationProfile(id)
  if (!record) throw new ExternalMcpGovernanceRepositoryError('ExternalIntegrationProfile not found.', 404)
  return record
}

async function mustGetMcpConnectionProfile(id: string) {
  const record = await getMcpConnectionProfile(id)
  if (!record) throw new ExternalMcpGovernanceRepositoryError('McpConnectionProfile not found.', 404)
  return record
}

async function mustGetExternalActionProposal(id: string) {
  const record = await getExternalActionProposal(id)
  if (!record) throw new ExternalMcpGovernanceRepositoryError('ExternalActionProposal not found.', 404)
  return record
}

async function mustGetIntegrationRiskAssessment(id: string) {
  const record = await getIntegrationRiskAssessment(id)
  if (!record) throw new ExternalMcpGovernanceRepositoryError('IntegrationRiskAssessment not found.', 404)
  return record
}

async function mustGetExternalActionReviewRecord(id: string) {
  const record = await getExternalActionReviewRecord(id)
  if (!record) throw new ExternalMcpGovernanceRepositoryError('ExternalActionReviewRecord not found.', 404)
  return record
}

async function updateStatus(table: 'external_integration_profiles' | 'mcp_connection_profiles' | 'external_action_proposals', id: string, status: string, reason: string) {
  await prisma.$executeRawUnsafe(
    `UPDATE ${table} SET status = ?, reviewedBy = ?, reviewedAt = ?, rejectionReason = ?, updatedAt = ? WHERE id = ?`,
    status,
    status === 'approved_record' || status === 'rejected' ? 'kelvin' : null,
    status === 'approved_record' || status === 'rejected' ? new Date() : null,
    status === 'rejected' ? reason : null,
    new Date(),
    id
  )
}

async function statusResult(resourceType: string, id: string, correlationId: string, beforeStatus: string, afterStatus: string, reason: string, taskId?: string) {
  const eventType = eventTypeForResource(resourceType, afterStatus)
  const auditEvents = await audit({
    correlationId,
    taskId,
    eventType,
    actorType: afterStatus === 'approved_record' || afterStatus === 'rejected' ? 'kelvin' : 'user',
    beforeStatus,
    afterStatus,
    reason: `${reason} Local governance record only; no external API, MCP, webhook, worker, queue, message, ToolRun, AgentRun, or Task completion.`,
    payload: { resourceType, resourceId: id, localRecordOnly: true },
  })
  const observabilityEvents = [await observe(correlationId, resourceType as never, id, eventType, reason)]
  const data = resourceType === 'external_integration_profile'
    ? await mustGetExternalIntegrationProfile(id)
    : resourceType === 'mcp_connection_profile'
      ? await mustGetMcpConnectionProfile(id)
      : await mustGetExternalActionProposal(id)
  return { data, auditEvents, observabilityEvents }
}

async function audit(input: {
  correlationId: string
  taskId?: string
  eventType: string
  actorType: string
  beforeStatus?: string
  afterStatus?: string
  reason: string
  payload: Record<string, unknown>
}) {
  const event = await prisma.harmonyAuditEvent.create({
    data: {
      correlationId: input.correlationId,
      taskId: input.taskId,
      eventType: input.eventType,
      actorType: input.actorType,
      beforeStatus: input.beforeStatus,
      afterStatus: input.afterStatus,
      reason: input.reason,
      payloadJson: encodeJson(input.payload),
    },
  })
  return [event]
}

async function observe(correlationId: string, resourceType: Parameters<typeof createObservabilityEvent>[0]['resourceType'], resourceId: string, eventType: string, message: string) {
  return createObservabilityEvent({
    correlationId,
    resourceType,
    resourceId,
    eventType,
    message,
    source: 'repository',
    attributes: { localRecordOnly: true, sprint: 13, allowWebhookDispatch: false },
  })
}

type ExternalProposalDefaults = Partial<Pick<ExternalActionProposal,
  'title' | 'summary' | 'proposedIntent' | 'proposedPayloadSummary' | 'actionCategory' | 'dataClassification' | 'riskLevel' | 'createdBy'
>>

function defaultExternalProposalInput(title: string, input: ExternalProposalDefaults) {
  return {
    title: input.title ?? title,
    summary: input.summary ?? 'Sprint 13 local External / MCP governance proposal. No external API, MCP, webhook, worker, queue, message, Agent, ToolRun, or Task completion is triggered.',
    proposedIntent: input.proposedIntent ?? 'Capture future external integration governance intent as a local review record.',
    proposedPayloadSummary: input.proposedPayloadSummary,
    actionCategory: input.actionCategory ?? 'other',
    dataClassification: input.dataClassification ?? 'unknown',
    riskLevel: input.riskLevel ?? 'medium',
    createdBy: input.createdBy ?? 'human',
  }
}

async function findAgentRun(id: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string; taskId: string; resultJson: string | null }>>`
    SELECT id, taskId, resultJson FROM agent_runs WHERE id = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

async function findToolRun(id: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string; taskId: string | null; agentRunId: string | null; status: string; mode: string; resultJson: string | null }>>`
    SELECT id, taskId, agentRunId, status, mode, resultJson FROM tool_runs WHERE id = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

async function findToolExecutionReceipt(id: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string; toolRunId: string; taskId: string | null; agentRunId: string | null; status: string; resultSummary: string; sideEffectClass: string; outputHash: string | null }>>`
    SELECT id, toolRunId, taskId, agentRunId, status, resultSummary, sideEffectClass, outputHash
    FROM tool_execution_receipts WHERE id = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

async function findCollaborationDecision(id: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string; taskId: string | null; status: string; title: string; recommendation: string }>>`
    SELECT id, taskId, status, title, recommendation FROM collaboration_decisions WHERE id = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

async function findFileChangeProposal(id: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string; taskId: string | null; status: string; title: string; summary: string }>>`
    SELECT id, taskId, status, title, summary FROM file_change_proposals WHERE id = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

async function findPullRequestPlan(id: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string; status: string; title: string; summary: string }>>`
    SELECT id, status, title, summary FROM pull_request_plans WHERE id = ${id} LIMIT 1
  `
  return rows[0] ?? null
}

function actorType(createdBy?: 'human' | 'system' | 'agent_record') {
  if (createdBy === 'system') return 'system'
  if (createdBy === 'agent_record') return 'agent_runtime'
  return 'user'
}

function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
