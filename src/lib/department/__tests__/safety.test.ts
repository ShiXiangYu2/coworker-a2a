import { describe, expect, it } from 'vitest'
import {
  validateDepartmentPermissionBoundarySafety,
  validateDepartmentReviewRecordSafety,
  validateDepartmentTokenBlockers,
  validateNoForbiddenDepartmentActionTerms,
  validateSupersedeRefs,
} from '../validators'

describe('Sprint 18 department safety validators', () => {
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

  it('requires consistent token blockers for all department records', () => {
    expect(() => validateDepartmentTokenBlockers(tokenBlockers)).not.toThrow()
    expect(() => validateDepartmentTokenBlockers({ ...tokenBlockers, isRoutingToken: true })).toThrow()
    expect(() => validateDepartmentTokenBlockers({ ...tokenBlockers, grantsRuntimePermission: true })).toThrow()
  })

  it('prevents DepartmentPermissionBoundary from granting runtime permission', () => {
    expect(() => validateDepartmentPermissionBoundarySafety({
      approvalMeaning: 'local_department_record_review_only',
      approvalDoesNotExecute: true,
      approvalDoesNotRoute: true,
      approvalDoesNotGrantFuturePermission: true,
      grantsRuntimePermission: false,
      isPermissionGrant: false,
    })).not.toThrow()

    expect(() => validateDepartmentPermissionBoundarySafety({
      approvalMeaning: 'local_department_record_review_only',
      approvalDoesNotExecute: true,
      approvalDoesNotRoute: true,
      approvalDoesNotGrantFuturePermission: true,
      grantsRuntimePermission: true,
      isPermissionGrant: false,
    })).toThrow()
  })

  it('keeps DepartmentReviewRecord approval local to one record', () => {
    expect(() => validateDepartmentReviewRecordSafety({
      doesNotExecuteAgent: true,
      doesNotContinueAgent: true,
      doesNotExecuteToolRun: true,
      doesNotExecuteWorkflow: true,
      doesNotWriteFile: true,
      doesNotRunGit: true,
      doesNotCallExternalApi: true,
      doesNotConnectMcp: true,
      doesNotCreatePr: true,
      doesNotDeployReleasePublish: true,
      doesNotCompleteTask: true,
      doesNotApproveFutureRecords: true,
    })).not.toThrow()

    expect(() => validateDepartmentReviewRecordSafety({
      doesNotExecuteAgent: true,
      doesNotContinueAgent: true,
      doesNotExecuteToolRun: true,
      doesNotExecuteWorkflow: true,
      doesNotWriteFile: true,
      doesNotRunGit: true,
      doesNotCallExternalApi: true,
      doesNotConnectMcp: true,
      doesNotCreatePr: true,
      doesNotDeployReleasePublish: true,
      doesNotCompleteTask: true,
      doesNotApproveFutureRecords: false,
    })).toThrow()
  })

  it('requires superseded records to carry supersede refs', () => {
    expect(() => validateSupersedeRefs({
      status: 'superseded',
      supersededByRecordId: 'new-record',
      supersededAt: new Date(),
      supersedeReason: 'new local record replaces this one',
    })).not.toThrow()

    expect(() => validateSupersedeRefs({ status: 'superseded' })).toThrow()
  })

  it('blocks forbidden UI and API semantics', () => {
    for (const label of [
      'Run Department',
      'Execute Department',
      'Assign Automatically',
      'Auto Route',
      'Delegate Now',
      'Continue Agent',
      'Run Agent',
      'Run Tool',
      'Execute Tool',
      'Execute Workflow',
      'Apply Change',
      'Write File',
      'Run Git',
      'Call API',
      'Connect MCP',
      'Create PR',
      'Deploy',
      'Publish',
      'Release',
      'Complete Task',
      'Retry',
      'Replay',
      'Rollback',
      'Restore',
      'Resume Execution',
    ]) {
      expect(() => validateNoForbiddenDepartmentActionTerms(label, 'test label')).toThrow()
    }
  })
})

