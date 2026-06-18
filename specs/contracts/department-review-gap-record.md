# Contract: DepartmentReviewGapRecord

Status: proposed for Sprint 19

## Purpose

DepartmentReviewGapRecord captures missing, weak, stale, conflicting, or unclear evidence coverage for a local Department record.

It is not an execution, routing, permission, live import, release, deploy, or remediation token.

## Fields

- `id: string`
- `targetSprint: 'sprint_19'`
- `baseline: 'sprint_1_18_complete'`
- `status: DepartmentEvidenceMappingStatus`
- `departmentRecordType: string`
- `departmentRecordId: string`
- `gapKind: 'missing_evidence' | 'weak_evidence' | 'conflicting_evidence' | 'stale_evidence' | 'unclear_boundary'`
- `gapSummary: string`
- `relatedEvidenceRefs: DepartmentMappingEvidenceRef[]`
- `recommendedLocalAction: string`
- `severity: 'low' | 'medium' | 'high'`
- `isExecutionToken: false`
- `isRoutingToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isTaskCompletionToken: false`
- `grantsRuntimePermission: false`
- `mutatesSourceRecords: false`
- `createdBy: 'user' | 'operator' | 'system_record'`
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

- A gap record must not trigger live evidence import, file read, URL fetch, external API call, MCP connection, or sync.
- A gap record may recommend local review actions only.
- A high severity gap must not block, route, assign, execute, deploy, release, or complete anything automatically.
- Gap closure requires local record lifecycle review only.
