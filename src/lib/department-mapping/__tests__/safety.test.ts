import { describe, expect, it } from 'vitest'
import {
  validateCoverageRecommendationOnly,
  validateDepartmentMappingReviewRecordSafety,
  validateDepartmentMappingRuntimeBlockers,
  validateDepartmentMappingTokenBlockers,
  validateGapRecommendationOnly,
  validateNoForbiddenDepartmentMappingActionTerms,
  validateSupersedeRefs,
} from '../validators'

describe('Sprint 19 department evidence mapping safety validators', () => {
  const tokenBlockers = {
    isExecutionToken: false,
    isRoutingToken: false,
    isPermissionGrant: false,
    isReleaseToken: false,
    isDeployToken: false,
    isTaskCompletionToken: false,
    grantsRuntimePermission: false,
    mutatesSourceRecords: false,
  }

  const runtimeBlockers = {
    importsLiveEvidence: false,
    syncsEvidence: false,
    triggersAgentRouting: false,
    triggersTaskAssignment: false,
  }

  it('requires consistent token blockers for all mapping records', () => {
    expect(() => validateDepartmentMappingTokenBlockers(tokenBlockers)).not.toThrow()
    expect(() => validateDepartmentMappingTokenBlockers({ ...tokenBlockers, isRoutingToken: true })).toThrow()
    expect(() => validateDepartmentMappingTokenBlockers({ ...tokenBlockers, grantsRuntimePermission: true })).toThrow()
  })

  it('blocks live evidence import, evidence sync, routing, and task assignment flags', () => {
    expect(() => validateDepartmentMappingRuntimeBlockers(runtimeBlockers)).not.toThrow()
    expect(() => validateDepartmentMappingRuntimeBlockers({ ...runtimeBlockers, importsLiveEvidence: true })).toThrow()
    expect(() => validateDepartmentMappingRuntimeBlockers({ ...runtimeBlockers, syncsEvidence: true })).toThrow()
    expect(() => validateDepartmentMappingRuntimeBlockers({ ...runtimeBlockers, triggersAgentRouting: true })).toThrow()
    expect(() => validateDepartmentMappingRuntimeBlockers({ ...runtimeBlockers, triggersTaskAssignment: true })).toThrow()
  })

  it('keeps coverage and gap records recommendation-only', () => {
    expect(() => validateCoverageRecommendationOnly({ recommendationOnly: true, status: 'approved_record' })).not.toThrow()
    expect(() => validateCoverageRecommendationOnly({ recommendationOnly: false })).toThrow()
    expect(() => validateGapRecommendationOnly({ recommendationOnly: true })).not.toThrow()
    expect(() => validateGapRecommendationOnly({ recommendationOnly: false })).toThrow()
  })

  it('keeps DepartmentMappingReviewRecord approval local to one mapping record', () => {
    expect(() => validateDepartmentMappingReviewRecordSafety({
      doesNotExecuteAgent: true,
      doesNotContinueAgent: true,
      doesNotAutoRouteTask: true,
      doesNotAssignAgent: true,
      doesNotExecuteToolRun: true,
      doesNotExecuteWorkflow: true,
      doesNotWriteFile: true,
      doesNotRunGit: true,
      doesNotCallExternalApi: true,
      doesNotConnectMcp: true,
      doesNotCreatePr: true,
      doesNotDeployReleasePublish: true,
      doesNotCompleteTask: true,
      doesNotApproveFutureMappings: true,
      statusChangeOnly: true,
    })).not.toThrow()

    expect(() => validateDepartmentMappingReviewRecordSafety({
      doesNotExecuteAgent: true,
      doesNotContinueAgent: true,
      doesNotAutoRouteTask: false,
      doesNotAssignAgent: true,
      doesNotExecuteToolRun: true,
      doesNotExecuteWorkflow: true,
      doesNotWriteFile: true,
      doesNotRunGit: true,
      doesNotCallExternalApi: true,
      doesNotConnectMcp: true,
      doesNotCreatePr: true,
      doesNotDeployReleasePublish: true,
      doesNotCompleteTask: true,
      doesNotApproveFutureMappings: true,
      statusChangeOnly: true,
    })).toThrow()
  })

  it('requires superseded records to carry supersede refs', () => {
    expect(() => validateSupersedeRefs({
      status: 'superseded',
      supersededByRecordId: 'new-local-record',
      supersededAt: new Date(),
      supersedeReason: 'new local mapping replaces this one',
    })).not.toThrow()

    expect(() => validateSupersedeRefs({ status: 'superseded' })).toThrow()
  })

  it('blocks forbidden UI and API semantics', () => {
    for (const label of [
      'Run Mapping',
      'Execute Mapping',
      'Auto Route',
      'Assign Agent',
      'Grant Permission',
      'Import Live',
      'Sync Evidence',
      'Run Agent',
      'Run Tool',
      'Execute Workflow',
      'Write File',
      'Run Git',
      'Call API',
      'Connect MCP',
      'Create PR',
      'Deploy',
      'Release',
      'Complete Task',
      'Retry',
      'Replay',
      'Rollback',
      'Restore',
      'Resume Execution',
    ]) {
      expect(() => validateNoForbiddenDepartmentMappingActionTerms(label, 'test label')).toThrow()
    }
  })
})
