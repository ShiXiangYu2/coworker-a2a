import { describe, expect, it } from 'vitest'
import {
  createDepartmentEvidenceCoverage,
  createDepartmentMappingReviewRecord,
  createDepartmentReviewGap,
  createEvidenceToDepartmentMapping,
  transitionDepartmentMappingRecord,
} from '../repository'

describe('Sprint 19 department-aware operator review local records', () => {
  it('creates mapping records without execution, routing, permission, live import, or sync tokens', async () => {
    const mapping = await createEvidenceToDepartmentMapping({
      mappingKey: `mapping_${Date.now()}`,
      title: 'Engineering evidence mapping',
      description: 'Maps sanitized evidence to a local department profile.',
      evidenceRecordType: 'sanitized_evidence_snapshot',
      evidenceRecordId: 'snapshot-1',
      evidenceSummary: 'Sanitized evidence summary only.',
      departmentRecordType: 'department_profile',
      departmentRecordId: 'department-1',
      departmentProfileId: 'department-1',
      mappingRationale: 'Supports review of local department profile responsibilities.',
    })

    expect(mapping.record.status).toBe('draft')
    expect(mapping.record.isExecutionToken).toBe(false)
    expect(mapping.record.isRoutingToken).toBe(false)
    expect(mapping.record.isPermissionGrant).toBe(false)
    expect(mapping.record.isReleaseToken).toBe(false)
    expect(mapping.record.isDeployToken).toBe(false)
    expect(mapping.record.isTaskCompletionToken).toBe(false)
    expect(mapping.record.grantsRuntimePermission).toBe(false)
    expect(mapping.record.mutatesSourceRecords).toBe(false)
    expect(mapping.record.importsLiveEvidence).toBe(false)
    expect(mapping.record.syncsEvidence).toBe(false)
    expect(mapping.record.triggersAgentRouting).toBe(false)
    expect(mapping.record.triggersTaskAssignment).toBe(false)
  })

  it('keeps coverage recommendation-only and does not auto-approve', async () => {
    const mapping = await createEvidenceToDepartmentMapping({
      mappingKey: `coverage_mapping_${Date.now()}`,
      title: 'Coverage mapping',
      description: 'Local mapping for coverage review.',
      evidenceRecordType: 'evidence_import_record',
      evidenceRecordId: 'evidence-1',
      evidenceSummary: 'Sanitized imported evidence only.',
      departmentRecordType: 'department_permission_boundary',
      departmentRecordId: 'boundary-1',
      departmentProfileId: 'department-coverage',
      mappingRationale: 'Describes why evidence supports the boundary.',
    })

    const coverage = await createDepartmentEvidenceCoverage({
      mappingRecordId: mapping.record.id,
      departmentProfileId: 'department-coverage',
      departmentRecordType: 'department_permission_boundary',
      departmentRecordId: 'boundary-1',
      coverageScope: 'permission boundary evidence',
      coverageLevel: 'partial',
      coverageSummary: 'Evidence partially covers the local permission boundary.',
    })

    expect(coverage.record.recommendationOnly).toBe(true)
    expect(coverage.record.status).toBe('draft')
    expect(coverage.record.grantsRuntimePermission).toBe(false)
    expect(coverage.record.triggersAgentRouting).toBe(false)
  })

  it('keeps gap records local and does not trigger live import, sync, or execution', async () => {
    const gap = await createDepartmentReviewGap({
      departmentProfileId: 'department-gap',
      departmentRecordType: 'department_responsibility_matrix',
      departmentRecordId: 'matrix-1',
      gapType: 'missing_sanitized_evidence',
      gapSummary: 'Responsibility matrix lacks sanitized evidence coverage.',
      riskLevel: 'medium',
      recommendedEvidence: ['manual sanitized context snapshot'],
    })

    expect(gap.record.recommendationOnly).toBe(true)
    expect(gap.record.importsLiveEvidence).toBe(false)
    expect(gap.record.syncsEvidence).toBe(false)
    expect(gap.record.isExecutionToken).toBe(false)
  })

  it('approves review records locally and does not complete tasks', async () => {
    const mapping = await createEvidenceToDepartmentMapping({
      mappingKey: `review_mapping_${Date.now()}`,
      title: 'Review mapping',
      description: 'Local mapping review target.',
      evidenceRecordType: 'sanitized_evidence_snapshot',
      evidenceRecordId: 'snapshot-review',
      evidenceSummary: 'Sanitized evidence only.',
      departmentRecordType: 'department_profile',
      departmentRecordId: 'department-review',
      departmentProfileId: 'department-review',
      mappingRationale: 'Supports local review only.',
    })

    const review = await createDepartmentMappingReviewRecord({
      targetType: 'evidence_to_department_mapping_record',
      targetId: mapping.record.id,
      verdict: 'approved_record',
      reviewNotes: 'Approved as a local mapping record only.',
    })

    expect(review.record.doesNotExecuteAgent).toBe(true)
    expect(review.record.doesNotAutoRouteTask).toBe(true)
    expect(review.record.doesNotAssignAgent).toBe(true)
    expect(review.record.doesNotCompleteTask).toBe(true)
    expect(review.record.doesNotApproveFutureMappings).toBe(true)

    const submitted = await transitionDepartmentMappingRecord({
      recordType: 'evidence_to_department_mapping_record',
      id: mapping.record.id,
      targetStatus: 'review',
      reason: 'Submit local mapping for review.',
    })
    expect(submitted.record.status).toBe('review')

    const approved = await transitionDepartmentMappingRecord({
      recordType: 'evidence_to_department_mapping_record',
      id: mapping.record.id,
      targetStatus: 'approved_record',
      reason: 'Approve local mapping only.',
    })
    expect(approved.record.status).toBe('approved_record')
    expect(approved.record.reviewedBy).toBe('kelvin')
  })
})
