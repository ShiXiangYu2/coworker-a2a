import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  DEPARTMENT_ASSIGNMENT_RUNTIME_BLOCKERS,
  DEPARTMENT_ASSIGNMENT_TOKEN_BLOCKERS,
  FORBIDDEN_DEPARTMENT_ASSIGNMENT_STATES,
  type DepartmentAssignmentEvidenceRef,
} from '../types'
import {
  validateDepartmentAssignmentApprovalSafety,
  validateDepartmentAssignmentAuditSafety,
  validateDepartmentAssignmentEvidenceRef,
  validateDepartmentAssignmentProposalSafety,
  validateDepartmentAssignmentRuntimeBlockers,
  validateDepartmentAssignmentTokenBlockers,
  validateDepartmentRoleFitReviewSafety,
} from '../validators'

describe('Sprint 21 department assignment safety boundary', () => {
  it('all Sprint 21 records have explicit token blockers', () => {
    validateDepartmentAssignmentTokenBlockers(DEPARTMENT_ASSIGNMENT_TOKEN_BLOCKERS)
    expect(DEPARTMENT_ASSIGNMENT_TOKEN_BLOCKERS).toEqual({
      isExecutionToken: false,
      isRoutingToken: false,
      isAssignmentToken: false,
      isPermissionGrant: false,
      isReleaseToken: false,
      isDeployToken: false,
      isTaskCompletionToken: false,
      grantsRuntimePermission: false,
      mutatesSourceRecords: false,
    })
  })

  it('all Sprint 21 records have explicit assignment/runtime blockers', () => {
    validateDepartmentAssignmentRuntimeBlockers(DEPARTMENT_ASSIGNMENT_RUNTIME_BLOCKERS)
    expect(DEPARTMENT_ASSIGNMENT_RUNTIME_BLOCKERS).toEqual({
      executesAgent: false,
      continuesAgent: false,
      routesTask: false,
      autoRoutesTask: false,
      assignsRuntimeAgent: false,
      startsAgentRun: false,
      executesToolRun: false,
      executesWorkflow: false,
      writesFile: false,
      runsGit: false,
      callsExternalApi: false,
      connectsMcp: false,
      createsPr: false,
      deploysOrReleases: false,
      completesTask: false,
    })
  })

  it('DepartmentAssignmentEvidenceRef is sanitized evidence only', () => {
    const ref: DepartmentAssignmentEvidenceRef = {
      sourceType: 'task',
      sourceId: 'task-1',
      summary: 'Sanitized task summary for local review.',
      redactionStatus: 'sanitized',
      reviewUseOnly: true,
      localReferenceOnly: true,
      ...DEPARTMENT_ASSIGNMENT_TOKEN_BLOCKERS,
    }
    expect(() => validateDepartmentAssignmentEvidenceRef(ref)).not.toThrow()
    expect(() => validateDepartmentAssignmentEvidenceRef({ ...ref, isAssignmentToken: true as false })).toThrow()
    expect(() => validateDepartmentAssignmentEvidenceRef({ ...ref, localReferenceOnly: false as true })).toThrow()
  })

  it('proposal and role fit records remain recommendation-only', () => {
    expect(() =>
      validateDepartmentAssignmentProposalSafety({
        assignmentRecommendationOnly: true,
        localReviewOnly: true,
        routesTask: false,
        autoRoutesTask: false,
        assignsRuntimeAgent: false,
      })
    ).not.toThrow()
    expect(() =>
      validateDepartmentRoleFitReviewSafety({
        recommendationOnly: true,
        doesNotAssignRuntimeAgent: true,
        assignsRuntimeAgent: false,
      })
    ).not.toThrow()
    expect(() =>
      validateDepartmentAssignmentProposalSafety({
        assignmentRecommendationOnly: true,
        localReviewOnly: true,
        routesTask: true,
        autoRoutesTask: false,
        assignsRuntimeAgent: false,
      })
    ).toThrow()
  })

  it('Kelvin approval only changes one local assignment record status', () => {
    expect(() =>
      validateDepartmentAssignmentApprovalSafety({
        doesNotExecuteAgent: true,
        doesNotContinueAgent: true,
        doesNotAutoRouteTask: true,
        doesNotAssignRuntimeAgent: true,
        doesNotExecuteToolRun: true,
        doesNotRequestRuntimePermission: true,
        doesNotApproveRuntimePermission: true,
        doesNotExecuteWorkflow: true,
        doesNotWriteFile: true,
        doesNotRunGit: true,
        doesNotCallExternalApi: true,
        doesNotConnectMcp: true,
        doesNotCreatePr: true,
        doesNotDeployReleasePublish: true,
        doesNotCompleteTask: true,
        doesNotApproveFutureAssignments: true,
      })
    ).not.toThrow()
  })

  it('audit record approval/archive/supersede cannot mutate source Task or assignment target', () => {
    expect(() =>
      validateDepartmentAssignmentAuditSafety({
        localAuditOnly: true,
        doesNotMutateTargetTask: true,
        doesNotAssignRuntimeAgent: true,
        doesNotTriggerExecution: true,
        mutatesSourceRecords: false,
        assignsRuntimeAgent: false,
        executesAgent: false,
      })
    ).not.toThrow()
  })

  it('forbidden runtime states are absent from lifecycle statuses', () => {
    expect(FORBIDDEN_DEPARTMENT_ASSIGNMENT_STATES).toContain('assigned_runtime')
    expect(FORBIDDEN_DEPARTMENT_ASSIGNMENT_STATES).toContain('auto_routed')
    expect(FORBIDDEN_DEPARTMENT_ASSIGNMENT_STATES).toContain('completed')
  })

  it('does not introduce Agent router, runtime assignment, permission, live execution, or Task completion API semantics', () => {
    const apiDir = join(process.cwd(), 'src', 'app', 'api')
    const source = readdirSync(apiDir, { recursive: true })
      .filter((file): file is string => typeof file === 'string' && file.endsWith('route.ts') && (file.includes('department-assignment') || file.includes('department-task') || file.includes('department-role-fit')))
      .map((file) => readFileSync(join(apiDir, file), 'utf8'))
      .join('\n')

    expect(source).not.toContain('agent-router')
    expect(source).not.toContain('runtime-assignment')
    expect(source).not.toContain('runtime-permission')
    expect(source).not.toContain('live-execution')
    expect(source).not.toContain('complete-task')
  })
})
