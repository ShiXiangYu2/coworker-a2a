import { describe, expect, it } from 'vitest'
import {
  createDepartmentAgentRole,
  createDepartmentPermissionBoundary,
  createDepartmentProfile,
  createDepartmentReviewRecord,
  transitionDepartmentRecord,
} from '../repository'

describe('Sprint 18 department local records', () => {
  it('creates local department records without routing or runtime permission tokens', async () => {
    const profile = await createDepartmentProfile({
      departmentKey: `engineering_${Date.now()}`,
      displayName: 'Engineering Department',
      mission: 'Own implementation planning as local organization metadata.',
      responsibilitySummary: 'Maintains local responsibility boundaries only.',
      evidenceRefs: [{
        sourceType: 'sanitized_evidence_snapshot',
        sourceId: 'snapshot-1',
        summary: 'Sanitized Sprint 17 evidence summary.',
        redactionStatus: 'sanitized',
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

    expect(profile.record.status).toBe('draft')
    expect(profile.record.isExecutionToken).toBe(false)
    expect(profile.record.isRoutingToken).toBe(false)
    expect(profile.record.isPermissionGrant).toBe(false)
    expect(profile.record.isTaskCompletionToken).toBe(false)
    expect(profile.record.grantsRuntimePermission).toBe(false)
    expect(profile.record.mutatesSourceRecords).toBe(false)

    const role = await createDepartmentAgentRole({
      departmentProfileId: profile.record.id,
      roleKey: 'implementation_reviewer',
      displayName: 'Implementation Reviewer',
      roleMission: 'Review local plans; does not continue or execute agents.',
    })
    expect(role.record.departmentProfileId).toBe(profile.record.id)
    expect(role.record.isRoutingToken).toBe(false)
  })

  it('keeps DepartmentPermissionBoundary descriptive only', async () => {
    const profile = await createDepartmentProfile({
      departmentKey: `governance_${Date.now()}`,
      displayName: 'Governance Department',
      mission: 'Describe local governance boundaries.',
      responsibilitySummary: 'No runtime permission consumption.',
    })

    const boundary = await createDepartmentPermissionBoundary({
      departmentProfileId: profile.record.id,
    })

    expect(boundary.record.approvalMeaning).toBe('local_department_record_review_only')
    expect(boundary.record.approvalDoesNotExecute).toBe(true)
    expect(boundary.record.approvalDoesNotRoute).toBe(true)
    expect(boundary.record.approvalDoesNotGrantFuturePermission).toBe(true)
    expect(boundary.record.grantsRuntimePermission).toBe(false)
  })

  it('approves review records locally and does not complete tasks', async () => {
    const profile = await createDepartmentProfile({
      departmentKey: `quality_${Date.now()}`,
      displayName: 'Quality Department',
      mission: 'Review quality evidence.',
      responsibilitySummary: 'Local review only.',
    })

    const review = await createDepartmentReviewRecord({
      targetType: 'department_profile',
      targetId: profile.record.id,
      verdict: 'approved_record',
      reviewNotes: 'Approved as local department profile evidence only.',
    })

    expect(review.record.doesNotExecuteAgent).toBe(true)
    expect(review.record.doesNotExecuteToolRun).toBe(true)
    expect(review.record.doesNotCompleteTask).toBe(true)
    expect(review.record.doesNotApproveFutureRecords).toBe(true)

    const submitted = await transitionDepartmentRecord({
      recordType: 'department_profile',
      id: profile.record.id,
      targetStatus: 'review',
      reason: 'Submit local department profile for review.',
    })
    expect(submitted.record.status).toBe('review')

    const approved = await transitionDepartmentRecord({
      recordType: 'department_profile',
      id: profile.record.id,
      targetStatus: 'approved_record',
      reason: 'Approve local department profile only.',
    })
    expect(approved.record.status).toBe('approved_record')
    expect(approved.record.reviewedBy).toBe('kelvin')
  })

  it('requires superseded state to stay local and carry refs', async () => {
    const profile = await createDepartmentProfile({
      departmentKey: `ops_${Date.now()}`,
      displayName: 'Operations Department',
      mission: 'Describe operations boundaries.',
      responsibilitySummary: 'Local organization metadata.',
    })
    await transitionDepartmentRecord({
      recordType: 'department_profile',
      id: profile.record.id,
      targetStatus: 'review',
      reason: 'Submit for review.',
    })
    await transitionDepartmentRecord({
      recordType: 'department_profile',
      id: profile.record.id,
      targetStatus: 'approved_record',
      reason: 'Approve local record only.',
    })
    const superseded = await transitionDepartmentRecord({
      recordType: 'department_profile',
      id: profile.record.id,
      targetStatus: 'superseded',
      supersededByRecordId: 'future-local-record',
      reason: 'Future local record replaces this one for review purposes only.',
    })

    expect(superseded.record.status).toBe('superseded')
    expect(superseded.record.supersededByRecordId).toBe('future-local-record')
    expect(superseded.record.supersedeReason).toContain('review purposes only')
  })
})
