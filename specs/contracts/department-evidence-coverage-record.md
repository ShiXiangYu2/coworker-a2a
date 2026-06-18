# Contract: DepartmentEvidenceCoverageRecord

Status: proposed for Sprint 19

## Purpose

DepartmentEvidenceCoverageRecord summarizes local evidence coverage for a Department record.

It is recommendation and review evidence only. It is not an approval token, execution token, routing token, permission grant, release token, deploy token, or task completion token.

## Fields

- `id: string`
- `targetSprint: 'sprint_19'`
- `baseline: 'sprint_1_18_complete'`
- `status: DepartmentEvidenceMappingStatus`
- `departmentRecordType: string`
- `departmentRecordId: string`
- `mappingRecordRefs: string[]`
- `requiredEvidenceKinds: string[]`
- `presentEvidenceKinds: string[]`
- `missingEvidenceKinds: string[]`
- `coverageStatus: 'missing' | 'partial' | 'sufficient' | 'needs_review'`
- `coverageSummary: string`
- `recommendation: 'add_evidence' | 'review_mapping' | 'approve_record' | 'reject_record'`
- `isExecutionToken: false`
- `isRoutingToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isTaskCompletionToken: false`
- `grantsRuntimePermission: false`
- `mutatesSourceRecords: false`
- `createdBy: 'user' | 'operator' | 'system_seed' | 'system_record'`
- `reviewedBy?: string`
- `reviewedAt?: string`
- `archivedAt?: string`
- `supersedesRecordId?: string`
- `supersededByRecordId?: string`
- `supersededAt?: string`
- `supersedeReason?: string`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`

## Rules

- Coverage is computed or recorded for local review only.
- `coverageStatus = 'sufficient'` does not approve execution, routing, runtime permission, deploy, release, or Task completion.
- `recommendation = 'approve_record'` is a local review recommendation only and must still require explicit local review action.
- Coverage records must not mutate mapped Evidence or Department source records.
