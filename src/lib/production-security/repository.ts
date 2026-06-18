import { randomUUID } from 'node:crypto'
import {
  agentPermissionBoundaries,
  agentProfiles,
  apiAuthBoundary,
  defaultSecurityPolicy,
  productionObservabilityPolicy,
  regressionGate,
  releaseReadinessChecklist,
  secretRedactionPolicy,
  skillIOContracts,
} from './defaults'
import { assertNoBlockedPayload } from './rules'
import type {
  LocalReviewRecord,
  ProductionRoleId,
  Sprint10AuditEvent,
  Sprint10ObservabilityEvent,
} from './types'

export function listSecurityPolicies() {
  return [defaultSecurityPolicy]
}

export function getSecurityPolicy(id: string) {
  return listSecurityPolicies().find((policy) => policy.id === id)
}

export function getEffectiveSecurityPolicy() {
  return defaultSecurityPolicy
}

export function listAgentProfiles() {
  return agentProfiles
}

export function getAgentProfile(id: string) {
  return agentProfiles.find((profile) => profile.id === id)
}

export function getAgentPermissionBoundary(agentIdOrBoundaryId: string) {
  return agentPermissionBoundaries.find(
    (boundary) => boundary.id === agentIdOrBoundaryId || boundary.agentId === agentIdOrBoundaryId
  )
}

export function listSkillIOContracts() {
  return skillIOContracts
}

export function getSkillIOContract(id: string) {
  return skillIOContracts.find((contract) => contract.id === id || contract.skillRef === id)
}

export function listRegressionGates() {
  return [regressionGate]
}

export function getRegressionGate(id: string) {
  return listRegressionGates().find((gate) => gate.id === id)
}

export function getRegressionGateChecks(id: string) {
  return getRegressionGate(id)?.requiredChecks
}

export function listReleaseReadiness() {
  return [releaseReadinessChecklist]
}

export function getReleaseReadiness(id: string) {
  return listReleaseReadiness().find((checklist) => checklist.id === id)
}

export function getApiAuthBoundary() {
  return apiAuthBoundary
}

export function getApiRoles() {
  return apiAuthBoundary.roles
}

export function getSecretRedactionPolicy() {
  return secretRedactionPolicy
}

export function getProductionObservabilityPolicy() {
  return productionObservabilityPolicy
}

export function getProductionObservabilityReadiness() {
  return {
    policyId: productionObservabilityPolicy.id,
    correlationRequired: productionObservabilityPolicy.correlationRequired,
    auditRequiredForMutations: productionObservabilityPolicy.auditRequiredForMutations,
    redactionRequired: productionObservabilityPolicy.redactionRequired,
    requiredCorrelationSurfaces: productionObservabilityPolicy.requiredCorrelationSurfaces,
    safetyNote:
      'Production observability is inspect-only and cannot replay, retry, deploy, start Agents, execute Tools, or bypass permissions.',
  }
}

export function reviewReleaseReadiness(input: {
  releaseReadinessId: string
  action: LocalReviewRecord['action']
  actorRole?: ProductionRoleId
  reviewedBy?: string
  decisionReason?: string
}) {
  const checklist = getReleaseReadiness(input.releaseReadinessId)
  if (!checklist) throw new Error('ReleaseReadinessChecklist not found.')
  const actorRole = input.actorRole ?? 'owner'
  const now = new Date().toISOString()
  const statusAfter =
    input.action === 'submit_review'
      ? 'ready_for_review'
      : input.action === 'approve_record'
        ? 'approved_record'
        : 'rejected'
  const reviewRecord: LocalReviewRecord = {
    id: randomUUID(),
    resourceType: 'release_readiness',
    resourceId: checklist.id,
    action: input.action,
    actorRole,
    reviewedBy: input.reviewedBy ?? 'kelvin',
    decisionReason: input.decisionReason ?? 'Sprint 10 local readiness review record.',
    statusAfter,
    executionToken: false,
    createdAt: now,
  }
  assertNoBlockedPayload(reviewRecord)
  const auditEvents: Sprint10AuditEvent[] = [
    {
      id: randomUUID(),
      eventType:
        input.action === 'submit_review'
          ? 'release_readiness.submitted_for_review'
          : input.action === 'approve_record'
            ? 'release_readiness.approved_record'
            : 'release_readiness.rejected',
      actorType: actorRole,
      actorId: reviewRecord.reviewedBy,
      resourceType: 'release_readiness',
      resourceId: checklist.id,
      reason: reviewRecord.decisionReason,
      payload: {
        reviewRecordId: reviewRecord.id,
        executionToken: false,
        deploys: false,
        startsRuntime: false,
      },
      createdAt: now,
    },
  ]
  const observabilityEvents: Sprint10ObservabilityEvent[] = [
    {
      id: randomUUID(),
      eventType: 'production_security.release_readiness_review_recorded',
      resourceType: 'release_readiness',
      resourceId: checklist.id,
      severity: 'info',
      message: 'Release readiness local review record was recorded without execution.',
      attributes: {
        reviewRecordId: reviewRecord.id,
        executionToken: false,
      },
      createdAt: now,
    },
  ]
  return {
    reviewRecord,
    releaseReadiness: {
      ...checklist,
      status: statusAfter,
      reviewedBy: reviewRecord.reviewedBy === 'kelvin' ? 'kelvin' as const : checklist.reviewedBy,
      reviewedAt: now,
      updatedAt: now,
    },
    auditEvents,
    observabilityEvents,
  }
}
