import { describe, expect, it } from 'vitest'
import {
  createExecutionApproval,
  createExecutionGate,
  createExecutionIntent,
  createExecutionPlan,
  createExecutionReceipt,
  transitionExecutionGatewayRecord,
} from '../repository'

describe('Sprint 20 human-gated execution local records', () => {
  it('creates intent records without execution, routing, permission, or task completion tokens', async () => {
    const intent = await createExecutionIntent({
      intentTitle: `Intent ${Date.now()}`,
      intentSummary: 'Local execution intent only.',
      requestedActionType: 'manual_review',
      requestedActionSummary: 'Review a possible action without invoking runtime.',
      expectedOutcome: 'A local record chain only.',
      riskSummary: 'No execution capability is granted.',
      sanitizedEvidenceRefs: [{
        sourceType: 'sanitized_evidence_snapshot',
        sourceId: 'snapshot-1',
        summary: 'Sanitized Sprint 1-19 evidence only.',
        redactionStatus: 'sanitized',
        reviewUseOnly: true,
        localReferenceOnly: true,
        isExecutionToken: false,
        isRoutingToken: false,
        isPermissionGrant: false,
        isReleaseToken: false,
        isDeployToken: false,
        isTaskCompletionToken: false,
        grantsRuntimePermission: false,
        mutatesSourceRecords: false,
      }],
    })

    expect(intent.record.status).toBe('draft')
    expect(intent.record.isExecutionToken).toBe(false)
    expect(intent.record.isRoutingToken).toBe(false)
    expect(intent.record.isPermissionGrant).toBe(false)
    expect(intent.record.grantsRuntimePermission).toBe(false)
    expect(intent.record.executesAgent).toBe(false)
    expect(intent.record.routesTask).toBe(false)
    expect(intent.record.assignsAgent).toBe(false)
    expect(intent.record.executesToolRun).toBe(false)
    expect(intent.record.executesWorkflow).toBe(false)
    expect(intent.record.writesFile).toBe(false)
    expect(intent.record.runsGit).toBe(false)
    expect(intent.record.callsExternalApi).toBe(false)
    expect(intent.record.connectsMcp).toBe(false)
    expect(intent.record.completesTask).toBe(false)
  })

  it('keeps plans non-executable and gates unable to grant runtime permission', async () => {
    const intent = await createExecutionIntent({
      intentTitle: `Plan Intent ${Date.now()}`,
      intentSummary: 'Intent for plan.',
      requestedActionType: 'operator_review',
      requestedActionSummary: 'Describe possible action for review.',
      expectedOutcome: 'Local plan record.',
      riskSummary: 'No runtime permission.',
    })

    const plan = await createExecutionPlan({
      intentRecordId: intent.record.id,
      planTitle: 'Local plan',
      planSummary: 'Non-executable plan.',
      plannedSteps: ['Review local records'],
      rollbackNotes: 'No rollback action because no execution occurs.',
    })

    const gate = await createExecutionGate({
      intentRecordId: intent.record.id,
      planRecordId: plan.record.id,
      gateName: 'Kelvin local review',
      gateSummary: 'Human gate for local record review.',
      gateDecision: 'approved_record',
    })

    expect(plan.record.nonExecutablePlanOnly).toBe(true)
    expect(plan.record.executesWorkflow).toBe(false)
    expect(gate.record.doesNotGrantRuntimePermission).toBe(true)
    expect(gate.record.grantsRuntimePermission).toBe(false)
    expect(gate.record.isPermissionGrant).toBe(false)
  })

  it('keeps receipts local and separate from ToolExecutionReceipt', async () => {
    const intent = await createExecutionIntent({
      intentTitle: `Receipt Intent ${Date.now()}`,
      intentSummary: 'Intent for receipt.',
      requestedActionType: 'audit_review',
      requestedActionSummary: 'Record a local receipt.',
      expectedOutcome: 'Local receipt only.',
      riskSummary: 'No source system access.',
    })

    const receipt = await createExecutionReceipt({
      intentRecordId: intent.record.id,
      receiptTitle: 'Local receipt',
      receiptSummary: 'Local review receipt only.',
      observedOutcomeSummary: 'No real runtime action occurred.',
      operatorNotes: 'No secrets, raw payloads, command outputs, or file contents.',
    })

    expect(receipt.record.actualExecutionPerformed).toBe(false)
    expect(receipt.record.sourceSystemAccessed).toBe(false)
    expect(receipt.record.receiptIsLocalRecordOnly).toBe(true)
    expect(receipt.record.receiptIsNotRuntimeReceipt).toBe(true)
    expect(receipt.record.receiptIsNotToolExecutionReceipt).toBe(true)
  })

  it('approval records only approve one local record and lifecycle does not complete tasks', async () => {
    const intent = await createExecutionIntent({
      intentTitle: `Approval Intent ${Date.now()}`,
      intentSummary: 'Intent for approval.',
      requestedActionType: 'kelvin_review',
      requestedActionSummary: 'Local review only.',
      expectedOutcome: 'Approved local record.',
      riskSummary: 'No future execution approval.',
    })

    const approval = await createExecutionApproval({
      targetType: 'execution_intent_record',
      targetId: intent.record.id,
      verdict: 'approved_record',
      reviewNotes: 'Approved as one local execution intent record only.',
    })

    expect(approval.record.doesNotExecuteAgent).toBe(true)
    expect(approval.record.doesNotAutoRouteTask).toBe(true)
    expect(approval.record.doesNotAssignAgent).toBe(true)
    expect(approval.record.doesNotCompleteTask).toBe(true)
    expect(approval.record.doesNotApproveFutureExecutions).toBe(true)

    const submitted = await transitionExecutionGatewayRecord({
      recordType: 'execution_intent_record',
      id: intent.record.id,
      targetStatus: 'review',
      reason: 'Submit local execution intent for review.',
    })
    expect(submitted.record.status).toBe('review')

    const approved = await transitionExecutionGatewayRecord({
      recordType: 'execution_intent_record',
      id: intent.record.id,
      targetStatus: 'approved_record',
      reason: 'Approve local execution intent only.',
    })
    expect(approved.record.status).toBe('approved_record')
    expect(approved.record.reviewedBy).toBe('kelvin')
  })
})
