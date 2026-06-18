# Contract: EvidenceToDepartmentMappingRecord

Status: proposed for Sprint 19

## Purpose

EvidenceToDepartmentMappingRecord maps sanitized evidence to one local Department record for Operator review.

It is not an execution, routing, runtime permission, release, deploy, live import, or task completion token.

## Fields

- `id: string`
- `targetSprint: 'sprint_19'`
- `baseline: 'sprint_1_18_complete'`
- `status: DepartmentEvidenceMappingStatus`
- `departmentRecordType: 'department_profile' | 'department_agent_role' | 'department_responsibility_matrix' | 'department_escalation_policy' | 'department_permission_boundary'`
- `departmentRecordId: string`
- `mappingPurpose: 'supports_responsibility' | 'supports_boundary' | 'supports_escalation' | 'supports_role' | 'supports_review'`
- `coverageStrength: 'weak' | 'partial' | 'sufficient' | 'strong'`
- `evidenceRefs: DepartmentMappingEvidenceRef[]`
- `riskNotes: string[]`
- `gapRefs: string[]`
- `reviewRecordRefs: string[]`
- `isExecutionToken: false`
- `isRoutingToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isTaskCompletionToken: false`
- `grantsRuntimePermission: false`
- `mutatesSourceRecords: false`
- `createdBy: 'user' | 'operator' | 'system_seed'`
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

## Evidence Ref

DepartmentMappingEvidenceRef:

- `sourceType: 'evidence_import_record' | 'sanitized_evidence_snapshot' | 'department_profile' | 'department_agent_role' | 'department_responsibility_matrix' | 'department_escalation_policy' | 'department_permission_boundary' | 'department_review_record' | 'audit_event' | 'observability_event' | 'eval_run' | 'regression_gate' | 'release_readiness_checklist'`
- `sourceId?: string`
- `summary: string`
- `redactionStatus: 'sanitized' | 'redacted'`
- `isExecutionToken: false`
- `isRoutingToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isTaskCompletionToken: false`

## Rules

- Mapping may reference Sprint 1-18 records as sanitized evidence only.
- Mapping must not dereference external paths, URLs, endpoints, MCP metadata, or live systems.
- Mapping must not mutate Department records or Evidence records except through explicit local mapping lifecycle records.
- Mapping approval changes only the mapping record status.
- Mapping approval must not route Task, assign Agent, execute Agent, execute ToolRun, execute workflow, grant permission, deploy, release, or complete Task.
