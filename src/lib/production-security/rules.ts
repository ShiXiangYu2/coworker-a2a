import {
  agentPermissionBoundaries,
  agentProfiles,
  forbiddenApiRouteSemantics,
  forbiddenExecutionActions,
} from './defaults'
import type {
  AgentPermissionBoundary,
  AgentProfile,
  ApiAuthBoundary,
  ProductionRoleId,
  RegressionGate,
  ReleaseReadinessChecklist,
  SecurityPolicy,
  SkillIOContract,
} from './types'

const executionCapabilityKeys: Array<keyof AgentPermissionBoundary> = [
  'mayMutateTaskStatus',
  'mayStartAgentRun',
  'mayExecuteTool',
  'mayCreateExecutableToolRun',
  'mayCallExternalApi',
  'mayCallMcp',
  'mayWriteFile',
  'mayUseShell',
  'mayUseGit',
  'mayCreatePr',
  'mayDeploy',
  'mayDelete',
  'mayDispatchA2A',
  'mayResumeExecution',
  'mayBypassPermission',
]

const blockedPayloadKeys = /rawPayload|fullFileContent|fullCommandOutput|externalPayload|apiKey|accessToken|privateKey|cookie/i

export function validateSecurityPolicy(policy: SecurityPolicy, globalPolicy?: SecurityPolicy): string[] {
  const errors: string[] = []
  if (policy.defaultDecision !== 'deny') errors.push('SecurityPolicy defaultDecision must be deny.')
  if (!policy.auditRequired) errors.push('SecurityPolicy must require audit.')
  if (!policy.correlationRequired) errors.push('SecurityPolicy must require correlationId.')
  if (!policy.redactionRequired) errors.push('SecurityPolicy must require redaction.')
  for (const action of policy.forbiddenExecutionActions) {
    if (policy.allowedRecordActions.includes(action)) {
      errors.push(`SecurityPolicy allowedRecordActions must not include forbidden action ${action}.`)
    }
  }
  if (policy.scope === 'resource' && globalPolicy) {
    const globalAllowed = new Set(globalPolicy.allowedRecordActions)
    for (const action of policy.allowedRecordActions) {
      if (!globalAllowed.has(action)) {
        errors.push('Resource-scoped SecurityPolicy cannot loosen global SecurityPolicy.')
      }
    }
  }
  return errors
}

export function validateAgentPermissionBoundary(boundary: AgentPermissionBoundary): string[] {
  const errors: string[] = []
  for (const key of executionCapabilityKeys) {
    if (boundary[key] !== false) errors.push(`${String(key)} must be false in Sprint 10.`)
  }
  return errors
}

export function validateCeoIdentityMapping(profiles: AgentProfile[] = agentProfiles): string[] {
  const errors: string[] = []
  const activeCeoProfiles = profiles.filter((profile) => profile.role === 'ceo_agent' && profile.status === 'active')
  const activeCeoIds = activeCeoProfiles.map((profile) => profile.id)
  if (activeCeoIds.includes('claude_ceo') && activeCeoIds.includes('elon')) {
    errors.push('claude_ceo and elon cannot both be active CEO execution identities.')
  }
  const elon = profiles.find((profile) => profile.id === 'elon')
  if (elon && !elon.modelIdentity && !elon.personaAlias) {
    errors.push('Existing elon CEO profile must map to modelIdentity or personaAlias.')
  }
  return errors
}

export function canClaudeCeoPerform(action: string): boolean {
  const boundary = agentPermissionBoundaries.find((item) => item.agentId === 'claude_ceo')
  if (!boundary) return false
  const normalized = action.trim().toLowerCase()
  if (forbiddenExecutionActions.some((forbidden) => normalized.includes(forbidden.replaceAll('_', ' ')))) {
    return false
  }
  return boundary.allowedActions.some((allowed) => normalized === allowed || normalized.includes(allowed))
}

export function validateSkillIOContract(contract: SkillIOContract): string[] {
  const errors: string[] = []
  if (contract.allowedSideEffects !== 'none') errors.push('SkillIOContract allowedSideEffects must be none.')
  if (contract.skillCategory === 'tooling') {
    const forbiddenOutputs = contract.forbiddenOutputs.map((item) => item.toLowerCase())
    if (!forbiddenOutputs.includes('tooldefinition'.toLowerCase())) {
      errors.push('Tooling SkillIOContract must forbid ToolDefinition output.')
    }
    if (!forbiddenOutputs.includes('toolexecutor'.toLowerCase())) {
      errors.push('Tooling SkillIOContract must forbid ToolExecutor output.')
    }
  }
  return errors
}

export function actorRoleGrantsPermission(role: ProductionRoleId): boolean {
  void role
  return false
}

export function canRoleApproveHighRiskLocalRecord(boundary: ApiAuthBoundary, role: ProductionRoleId): boolean {
  return boundary.roles.find((item) => item.id === role)?.mayApproveHighRiskLocalRecord ?? false
}

export function containsBlockedPayload(value: unknown): boolean {
  return findBlockedPayloadPath(value) !== undefined
}

export function findBlockedPayloadPath(value: unknown, path = '$'): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findBlockedPayloadPath(value[index], `${path}[${index}]`)
      if (found) return found
    }
    return undefined
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`
    if (blockedPayloadKeys.test(key)) return childPath
    const found = findBlockedPayloadPath(child, childPath)
    if (found) return found
  }
  return undefined
}

export function assertNoBlockedPayload(value: unknown): void {
  const path = findBlockedPayloadPath(value)
  if (path) throw new Error(`Blocked payload cannot be persisted into production security surfaces: ${path}.`)
}

export function isReleaseReadinessExecutionToken(checklist: ReleaseReadinessChecklist): false {
  void checklist
  return false
}

export function isRegressionGateExecutionToken(gate: RegressionGate): false {
  void gate
  return false
}

export function routeHasForbiddenSprint10Semantics(routePath: string): boolean {
  const normalized = routePath.toLowerCase()
  return forbiddenApiRouteSemantics.some((fragment) => normalized.includes(fragment))
}
