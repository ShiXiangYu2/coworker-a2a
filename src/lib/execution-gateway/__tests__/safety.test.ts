import { describe, expect, it } from 'vitest'
import {
  validateExecutionApprovalSafety,
  validateExecutionBlockers,
  validateExecutionEvidenceRef,
  validateExecutionGateDecisionSafety,
  validateExecutionReceiptSafety,
  validateExecutionTokenBlockers,
  validateNoForbiddenExecutionGatewayActionTerms,
  validateSupersedeRefs,
} from '../validators'

describe('Sprint 20 execution gateway safety validators', () => {
  const tokenBlockers = {
    isExecutionToken: false,
    isRoutingToken: false,
    isPermissionGrant: false,
    isReleaseToken: false,
    isDeployToken: false,
    isTaskCompletionToken: false,
    grantsRuntimePermission: false,
    mutatesSourceRecords: false,
  } as const

  const executionBlockers = {
    executesAgent: false,
    continuesAgent: false,
    routesTask: false,
    assignsAgent: false,
    executesToolRun: false,
    executesWorkflow: false,
    writesFile: false,
    runsGit: false,
    callsExternalApi: false,
    connectsMcp: false,
    createsPr: false,
    deploysOrReleases: false,
    completesTask: false,
  } as const

  it('requires explicit token blockers for all execution records', () => {
    expect(() => validateExecutionTokenBlockers(tokenBlockers)).not.toThrow()
    expect(() => validateExecutionTokenBlockers({ ...tokenBlockers, isExecutionToken: true })).toThrow()
    expect(() => validateExecutionTokenBlockers({ ...tokenBlockers, grantsRuntimePermission: true })).toThrow()
  })

  it('requires explicit execution blockers for all execution records', () => {
    expect(() => validateExecutionBlockers(executionBlockers)).not.toThrow()
    expect(() => validateExecutionBlockers({ ...executionBlockers, executesAgent: true })).toThrow()
    expect(() => validateExecutionBlockers({ ...executionBlockers, routesTask: true })).toThrow()
    expect(() => validateExecutionBlockers({ ...executionBlockers, writesFile: true })).toThrow()
  })

  it('keeps ExecutionEvidenceRef sanitized evidence only', () => {
    expect(() => validateExecutionEvidenceRef({
      sourceType: 'sanitized_evidence_snapshot',
      sourceId: 'snapshot-1',
      summary: 'Sanitized local review reference.',
      redactionStatus: 'sanitized',
      reviewUseOnly: true,
      localReferenceOnly: true,
      ...tokenBlockers,
    })).not.toThrow()

    expect(() => validateExecutionEvidenceRef({
      sourceType: 'task',
      summary: 'Task reference.',
      redactionStatus: 'sanitized',
      reviewUseOnly: false as true,
      localReferenceOnly: true,
      ...tokenBlockers,
    })).toThrow()
  })

  it('prevents gateDecision from becoming runtime permission', () => {
    expect(() => validateExecutionGateDecisionSafety({
      gateDecision: 'approved_record',
      doesNotGrantRuntimePermission: true,
      grantsRuntimePermission: false,
      isPermissionGrant: false,
    })).not.toThrow()

    expect(() => validateExecutionGateDecisionSafety({
      gateDecision: 'approved_record',
      doesNotGrantRuntimePermission: true,
      grantsRuntimePermission: true,
      isPermissionGrant: false,
    })).toThrow()
  })

  it('prevents receipts from claiming real execution or ToolExecutionReceipt semantics', () => {
    expect(() => validateExecutionReceiptSafety({
      actualExecutionPerformed: false,
      sourceSystemAccessed: false,
      receiptIsLocalRecordOnly: true,
      receiptIsNotRuntimeReceipt: true,
      receiptIsNotToolExecutionReceipt: true,
      receiptSummary: 'Local review receipt.',
      observedOutcomeSummary: 'No real execution occurred.',
      operatorNotes: 'Review note only.',
    })).not.toThrow()

    expect(() => validateExecutionReceiptSafety({
      actualExecutionPerformed: true,
      sourceSystemAccessed: false,
      receiptIsLocalRecordOnly: true,
      receiptIsNotRuntimeReceipt: true,
      receiptIsNotToolExecutionReceipt: true,
    })).toThrow()
  })

  it('keeps Kelvin approval local to one execution record', () => {
    expect(() => validateExecutionApprovalSafety({
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
      doesNotApproveFutureExecutions: true,
    })).not.toThrow()

    expect(() => validateExecutionApprovalSafety({
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
      doesNotApproveFutureExecutions: true,
    })).toThrow()
  })

  it('requires superseded records to carry supersede refs', () => {
    expect(() => validateSupersedeRefs({
      status: 'superseded',
      supersededByRecordId: 'new-local-record',
      supersededAt: new Date(),
      supersedeReason: 'new local execution record replaces this one',
    })).not.toThrow()

    expect(() => validateSupersedeRefs({ status: 'superseded' })).toThrow()
  })

  it('blocks forbidden UI and API semantics', () => {
    for (const label of [
      'Run Execution',
      'Execute Now',
      'Continue Agent',
      'Auto Route',
      'Assign Agent',
      'Run Tool',
      'Execute Workflow',
      'Apply Change',
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
      'Resume Execution',
    ]) {
      expect(() => validateNoForbiddenExecutionGatewayActionTerms(label, 'test label')).toThrow()
    }
  })
})
