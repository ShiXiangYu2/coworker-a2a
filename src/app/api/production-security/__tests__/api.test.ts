import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GET as getEffectivePolicy } from '../../security/effective-policy/route'
import { GET as listAgentProfiles } from '../../agent-profiles/route'
import { GET as getClaudePermissionBoundary } from '../../agent-profiles/[id]/permission-boundary/route'
import { GET as listSkillIOContracts } from '../../skill-io-contracts/route'
import { GET as listReleaseReadiness } from '../../release-readiness/route'
import { POST as approveReleaseReadiness } from '../../release-readiness/[id]/approve-record/route'
import { GET as listRegressionGates } from '../../regression-gates/route'
import { GET as getRegressionChecks } from '../../regression-gates/[id]/checks/route'
import { GET as getAuthBoundary } from '../../auth-boundary/route'
import { GET as getAuthRoles } from '../../auth-boundary/roles/route'
import { GET as getProductionObservabilityPolicy } from '../../production-observability/policy/route'
import { GET as getRedactionPolicy } from '../../production-observability/redaction-policy/route'

const apiRoot = join(process.cwd(), 'src', 'app', 'api')

function request(body?: unknown) {
  return new Request('http://localhost/api/test', {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('Sprint 10 production security API', () => {
  it('returns default-deny effective policy', async () => {
    const response = await getEffectivePolicy()
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.data.defaultDecision).toBe('deny')
    expect(body.data.forbiddenExecutionActions).toContain('execute_tool')
  })

  it('returns AgentProfiles with explicit CEO identity mapping', async () => {
    const response = await listAgentProfiles()
    const body = await response.json()
    const claude = body.data.find((profile: { id: string }) => profile.id === 'claude_ceo')
    const elon = body.data.find((profile: { id: string }) => profile.id === 'elon')
    expect(claude.status).toBe('active')
    expect(elon.status).not.toBe('active')
    expect(elon.modelIdentity).toBe('claude_ceo')
    expect(elon.personaAlias).toBe('elon')
  })

  it('returns read-only Sprint 10 governance surfaces', async () => {
    const [
      boundaryResponse,
      skillResponse,
      readinessResponse,
      regressionResponse,
      regressionChecksResponse,
      authBoundaryResponse,
      authRolesResponse,
      observabilityPolicyResponse,
      redactionPolicyResponse,
    ] = await Promise.all([
      getClaudePermissionBoundary(request(), { params: Promise.resolve({ id: 'claude_ceo' }) }),
      listSkillIOContracts(),
      listReleaseReadiness(),
      listRegressionGates(),
      getRegressionChecks(request(), { params: Promise.resolve({ id: 'regression-gate-sprint-10' }) }),
      getAuthBoundary(),
      getAuthRoles(),
      getProductionObservabilityPolicy(),
      getRedactionPolicy(),
    ])

    const boundaryBody = await boundaryResponse.json()
    const skillBody = await skillResponse.json()
    const readinessBody = await readinessResponse.json()
    const regressionBody = await regressionResponse.json()
    const regressionChecksBody = await regressionChecksResponse.json()
    const authBoundaryBody = await authBoundaryResponse.json()
    const authRolesBody = await authRolesResponse.json()
    const observabilityBody = await observabilityPolicyResponse.json()
    const redactionBody = await redactionPolicyResponse.json()

    expect(boundaryBody.data.mayExecuteTool).toBe(false)
    expect(boundaryBody.data.mayStartAgentRun).toBe(false)
    expect(skillBody.data.some((contract: { skillCategory: string }) => contract.skillCategory === 'tooling')).toBe(true)
    expect(readinessBody.data[0].targetSprint).toBe('sprint_10')
    expect(regressionBody.data[0].targetSprint).toBe('sprint_10')
    expect(regressionBody.data[0].coverageSummary).not.toHaveProperty('sprint11')
    expect(regressionBody.data[0].coverageSummary).not.toHaveProperty('sprint12')
    expect(regressionChecksBody.data.map((check: { sprint: string }) => check.sprint)).not.toContain('sprint_11')
    expect(regressionChecksBody.data.map((check: { sprint: string }) => check.sprint)).not.toContain('sprint_12')
    expect(authBoundaryBody.data.authMode).toBe('local_single_user')
    expect(authRolesBody.data.find((role: { id: string }) => role.id === 'agent_record').mayApproveHighRiskLocalRecord).toBe(false)
    expect(observabilityBody.data.auditRequiredForMutations).toBe(true)
    expect(redactionBody.data.blockedPayloadDestinations).toContain('agent_prompt')
  })

  it('release readiness approval returns audit and observability records without execution token', async () => {
    const response = await approveReleaseReadiness(
      request({ reviewedBy: 'kelvin', decisionReason: 'Local readiness review only.' }),
      { params: Promise.resolve({ id: 'release-readiness-sprint-10' }) }
    )
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.data.reviewRecord.executionToken).toBe(false)
    expect(body.auditEvents[0].payload.executionToken).toBe(false)
    expect(body.auditEvents[0].payload.deploys).toBe(false)
    expect(body.observabilityEvents.length).toBeGreaterThan(0)
  })

  it('does not add Sprint 10 execution-semantics route paths', () => {
    const routePaths = listRoutePaths(apiRoot)
    const sprint10Routes = routePaths.filter((path) =>
      path.startsWith('security/') ||
      path.startsWith('agent-profiles/') ||
      path.startsWith('skill-io-contracts/') ||
      path.startsWith('release-readiness/') ||
      path.startsWith('regression-gates/') ||
      path.startsWith('auth-boundary/') ||
      path.startsWith('production-observability/')
    )

    expect(sprint10Routes).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/execute|run-tool|start-agent|apply|create-pr|deploy|dispatch|auto-fix|resume-execution|bypass-permission|send-external-request|call-external|\/mcp|\/shell|\/git|write-file|delete/i),
      ])
    )
  })
})

function listRoutePaths(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return listRoutePaths(path)
    return name === 'route.ts' ? [relative(apiRoot, path).split('\\').join('/')] : []
  })
}
