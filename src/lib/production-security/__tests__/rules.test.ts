import { describe, expect, it } from 'vitest'
import {
  agentPermissionBoundaries,
  agentProfiles,
  apiAuthBoundary,
  defaultSecurityPolicy,
  regressionGate,
  releaseReadinessChecklist,
  skillIOContracts,
} from '../defaults'
import {
  actorRoleGrantsPermission,
  assertNoBlockedPayload,
  canClaudeCeoPerform,
  canRoleApproveHighRiskLocalRecord,
  containsBlockedPayload,
  isRegressionGateExecutionToken,
  isReleaseReadinessExecutionToken,
  validateAgentPermissionBoundary,
  validateCeoIdentityMapping,
  validateSecurityPolicy,
  validateSkillIOContract,
} from '../rules'

describe('Sprint 10 production security rules', () => {
  it('keeps SecurityPolicy default-deny and prevents scoped policy loosening', () => {
    expect(validateSecurityPolicy(defaultSecurityPolicy)).toEqual([])

    const loosened = {
      ...defaultSecurityPolicy,
      id: 'resource-policy',
      scope: 'resource' as const,
      resourceType: 'task',
      resourceId: 'task_1',
      allowedRecordActions: [...defaultSecurityPolicy.allowedRecordActions, 'execute_tool'],
    }

    expect(validateSecurityPolicy(loosened, defaultSecurityPolicy)).toContain(
      'Resource-scoped SecurityPolicy cannot loosen global SecurityPolicy.'
    )
  })

  it('forbids execution capabilities for every AgentPermissionBoundary', () => {
    for (const boundary of agentPermissionBoundaries) {
      expect(validateAgentPermissionBoundary(boundary)).toEqual([])
    }
  })

  it('keeps claude_ceo and elon from becoming parallel active CEO identities', () => {
    expect(validateCeoIdentityMapping(agentProfiles)).toEqual([])
    const unsafe = agentProfiles.map((profile) =>
      profile.id === 'elon' ? { ...profile, status: 'active' as const } : profile
    )
    expect(validateCeoIdentityMapping(unsafe)).toContain(
      'claude_ceo and elon cannot both be active CEO execution identities.'
    )
  })

  it('limits Claude CEO to planning and local proposal behavior', () => {
    expect(canClaudeCeoPerform('propose_tool_call_record')).toBe(true)
    expect(canClaudeCeoPerform('execute tool')).toBe(false)
    expect(canClaudeCeoPerform('run shell')).toBe(false)
    expect(canClaudeCeoPerform('deploy')).toBe(false)
  })

  it('keeps SkillIOContract side-effect free and prevents tooling execution interpretation', () => {
    for (const contract of skillIOContracts) {
      expect(validateSkillIOContract(contract)).toEqual([])
      expect(contract.allowedSideEffects).toBe('none')
    }
    const tooling = skillIOContracts.find((contract) => contract.skillCategory === 'tooling')
    expect(tooling?.forbiddenOutputs).toEqual(expect.arrayContaining(['ToolDefinition', 'ToolExecutor']))
  })

  it('keeps auth role actorType from granting permissions by itself', () => {
    expect(actorRoleGrantsPermission('owner')).toBe(false)
    expect(actorRoleGrantsPermission('operator')).toBe(false)
    expect(canRoleApproveHighRiskLocalRecord(apiAuthBoundary, 'owner')).toBe(true)
    expect(canRoleApproveHighRiskLocalRecord(apiAuthBoundary, 'agent_record')).toBe(false)
  })

  it('blocks sensitive payloads from production surfaces', () => {
    const payload = { evidence: { fullCommandOutput: 'secret output' } }
    expect(containsBlockedPayload(payload)).toBe(true)
    expect(() => assertNoBlockedPayload(payload)).toThrow(/Blocked payload/)
    expect(() => assertNoBlockedPayload({ summary: 'sanitized' })).not.toThrow()
  })

  it('does not treat readiness or regression status as execution tokens', () => {
    expect(isReleaseReadinessExecutionToken({
      ...releaseReadinessChecklist,
      status: 'approved_record',
    })).toBe(false)
    expect(isRegressionGateExecutionToken({
      ...regressionGate,
      status: 'passed',
    })).toBe(false)
  })

  it('keeps Sprint 10 readiness and regression scoped to Sprint 1-9 coverage', () => {
    expect(releaseReadinessChecklist.targetSprint).toBe('sprint_10')
    expect(regressionGate.targetSprint).toBe('sprint_10')
    expect(regressionGate.coverageSummary).not.toHaveProperty('sprint11')
    expect(regressionGate.coverageSummary).not.toHaveProperty('sprint12')
    expect(regressionGate.requiredChecks.map((check) => check.sprint)).not.toContain('sprint_11')
    expect(regressionGate.requiredChecks.map((check) => check.sprint)).not.toContain('sprint_12')
  })
})
