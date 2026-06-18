# PRD: Sprint 19 - Department-Aware Operator Review / Evidence-to-Department Mapping

Created: 2026-06-17
Status: proposed

## Current Baseline

Sprint 19 starts from Sprint 1-18 complete:

- Sprint 1-15 complete and sealed as MVP.
- Sprint 16 MVP Demo Polish / Operator Console UX complete and closed.
- Sprint 17 Read-only Evidence Import Sandbox complete and closed.
- Sprint 18 Department Agent Profiles complete and closed.

Sprint 19 must not add real execution, automatic routing, runtime permission, live evidence import, file / Git / PR, external API, MCP, workflow execution, Agent continuation, ToolRun execution, deploy, publish, release, task completion, retry, replay, rollback, restore, or resume capability.

## Problem

Sprint 17 introduced sanitized evidence records. Sprint 18 introduced Department records. Operators still need a local review layer that shows:

- which sanitized evidence supports each DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, and DepartmentPermissionBoundary.
- which department records have weak or missing evidence.
- which evidence can be used only as local review reference.
- how Kelvin reviews evidence-to-department mappings without approving execution, routing, permission, release, deploy, or task completion.
- how Operator Console presents department evidence coverage, gaps, risk notes, and audit timeline.

## Product Goal

Introduce local, auditable mapping records:

```text
Sprint 1-18 sanitized evidence and local department records
  -> EvidenceToDepartmentMappingRecord
  -> DepartmentEvidenceCoverageRecord
  -> DepartmentReviewGapRecord
  -> DepartmentMappingReviewRecord
  -> AuditEvent / ObservabilityEvent
  -> ChatHub / Task / Operator Console display
```

Sprint 19 explicitly does not implement:

```text
Mapping approval
  -> route Task
  -> assign Agent
  -> continue Agent
  -> execute AgentRun
  -> execute ToolRun
  -> execute workflow / step
  -> read or write file / run Git
  -> call external API / connect MCP
  -> create PR / deploy / publish / release
  -> complete Task
  -> retry / replay / rollback / restore / resume execution
```

## Scope

Sprint 19 includes specs for:

- EvidenceToDepartmentMappingRecord.
- DepartmentEvidenceCoverageRecord.
- DepartmentReviewGapRecord.
- DepartmentMappingReviewRecord.
- Department evidence mapping state machine.
- Department evidence mapping safety contract.
- API design for local mapping / coverage / gap / review records.
- ChatHub / Task / Operator Console mapping display design.
- AuditEvent and ObservabilityEvent integration.
- Recovery / Resume view-only integration.
- Eval / RegressionGate / ReleaseReadiness evidence-only checks.

## Non-Goals

Sprint 19 must not:

- execute Agent.
- continue Agent.
- auto-route Task.
- assign Agent at runtime.
- execute ToolRun.
- request or approve runtime permission.
- execute workflow or workflow step.
- read files, write files, apply patches, or format product target files.
- execute shell or Git.
- create PR.
- call external API.
- connect MCP.
- import live evidence.
- sync evidence from external systems.
- create webhook, worker, queue, or background job.
- deploy, publish, release, or delete.
- complete Task.
- retry, replay, rollback, restore, or resume execution.
- approve future department evidence mappings automatically.
- enter Sprint 19 implementation or Sprint 20.

## Evidence Boundary

Sprint 1-18 records may be referenced only as sanitized evidence or local review reference:

- EvidenceImportRecord.
- SanitizedEvidenceSnapshot.
- DepartmentProfile.
- DepartmentAgentRole.
- DepartmentResponsibilityMatrix.
- DepartmentEscalationPolicy.
- DepartmentPermissionBoundary.
- DepartmentReviewRecord.
- AuditEvent / ObservabilityEvent.
- EvalRun / RegressionGate / ReleaseReadinessChecklist.

Evidence refs must not be interpreted as execution, routing, permission, release, deploy, external access, MCP access, live import, or task completion tokens.

## Kelvin Human Confirmation Boundary

Kelvin approval in Sprint 19 only approves one local mapping, coverage, gap, or review record.

Kelvin approval must not:

- execute Agent.
- continue Agent.
- auto-route Task.
- assign Agent.
- execute ToolRun.
- execute workflow or workflow step.
- write files.
- execute Git.
- call external API.
- connect MCP.
- create PR.
- deploy, publish, release, or delete.
- complete Task.
- approve future similar mapping behavior.
- retry, replay, rollback, restore, or resume execution.

## Record Types

### EvidenceToDepartmentMappingRecord

Fields:

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

### DepartmentEvidenceCoverageRecord

Fields:

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
- token blocker fields fixed to false.
- lifecycle, audit, and supersede fields.

### DepartmentReviewGapRecord

Fields:

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
- token blocker fields fixed to false.
- lifecycle, audit, and supersede fields.

### DepartmentMappingReviewRecord

Fields:

- `id: string`
- `targetSprint: 'sprint_19'`
- `baseline: 'sprint_1_18_complete'`
- `targetType: 'mapping_record' | 'coverage_record' | 'gap_record'`
- `targetId: string`
- `status: DepartmentEvidenceMappingStatus`
- `reviewer: 'kelvin' | 'owner' | 'operator'`
- `verdict: 'needs_changes' | 'approved_record' | 'rejected'`
- `reviewNotes: string`
- `confirmationArtifactId?: string`
- `doesNotExecuteAgent: true`
- `doesNotContinueAgent: true`
- `doesNotRouteTask: true`
- `doesNotAssignAgent: true`
- `doesNotExecuteToolRun: true`
- `doesNotExecuteWorkflow: true`
- `doesNotWriteFile: true`
- `doesNotRunGit: true`
- `doesNotCallExternalApi: true`
- `doesNotConnectMcp: true`
- `doesNotCreatePr: true`
- `doesNotDeployReleasePublish: true`
- `doesNotCompleteTask: true`
- `doesNotApproveFutureMappings: true`
- token blocker fields fixed to false.
- lifecycle, audit, and supersede fields.

## API Design

Sprint 19 APIs may create, query, submit-review, approve-record, reject, supersede, and archive local mapping records only.

Recommended route groups:

- `/api/department-evidence-mappings`
- `/api/department-evidence-mappings/:id`
- `/api/department-evidence-mappings/:id/submit-review`
- `/api/department-evidence-mappings/:id/approve-record`
- `/api/department-evidence-mappings/:id/reject`
- `/api/department-evidence-mappings/:id/supersede`
- `/api/department-evidence-mappings/:id/archive`
- `/api/department-evidence-coverages`
- `/api/department-review-gaps`
- `/api/department-mapping-review-records`
- `/api/departments/:id/evidence-map`
- `/api/departments/:id/evidence-coverage`
- `/api/departments/:id/review-gaps`
- `/api/departments/:id/mapping-timeline`

APIs must not add Agent router, automatic routing, runtime permission, live evidence import, URL fetch, external API, MCP, ToolRun executor, workflow runner, file writer, Git executor, PR, deploy, release, retry, replay, rollback, restore, or resume semantics.

## UI Design

ChatHub, Task UI, and Operator Console may expose:

- View Department Evidence Map.
- View Evidence Coverage.
- View Department Review Gaps.
- Submit Mapping Review.
- Approve Mapping Record.
- Reject Mapping Record.
- Archive Mapping Record.
- View Mapping Audit.
- View Mapping Timeline.

Required Sprint 19 safety note:

```text
Department evidence mappings are local review records only. They do not route tasks, assign agents, execute tools, grant runtime permission, import live evidence, deploy, release, or complete tasks.
```

Forbidden UI labels:

- `Run Mapping`
- `Execute Mapping`
- `Auto Route`
- `Assign Agent`
- `Grant Permission`
- `Import Live`
- `Sync Evidence`
- `Run Agent`
- `Run Tool`
- `Execute Workflow`
- `Write File`
- `Run Git`
- `Call API`
- `Connect MCP`
- `Create PR`
- `Deploy`
- `Release`
- `Complete Task`
- `Retry`
- `Replay`
- `Rollback`
- `Restore`
- `Resume Execution`

## Observability / Audit / Recovery / Resume

Sprint 19 may add audit and observability events for local mapping lifecycle changes.

Recovery and Resume integrations remain view-only and audit-only:

- RecoveryPoint can be linked as evidence.
- ResumePolicy can state that mapping records are not resumable execution.
- No rollback, restore, retry, replay, or resume execution may be triggered.

## Eval / RegressionGate / ReleaseReadiness

EvalRun, RegressionGate, and ReleaseReadinessChecklist may provide recommendation or evidence only.

They must not:

- execute Agent.
- route Task.
- grant runtime permission.
- approve mapping records automatically.
- release, deploy, or publish.
- satisfy Kelvin confirmation.
- complete Task.
- mutate source records.

Sprint 19 readiness must cover Sprint 1-18 regression.

## Acceptance Criteria

- Sprint 19 specs define local mapping / coverage / gap / review records.
- Sprint 19 baseline is Sprint 1-18 complete.
- No real execution capability is introduced.
- Mapping records never become execution, routing, permission, release, deploy, live import, or task completion tokens.
- Kelvin approval only changes one local mapping record status.
- State machine includes only `draft`, `review`, `approved_record`, `rejected`, `superseded`, and `archived`.
- Forbidden runtime states are absent.
- APIs are local record lifecycle and linked query only.
- UI includes safety note and avoids forbidden labels.
- Observability, Audit, Recovery, Resume, Eval, RegressionGate, and ReleaseReadiness remain view-only / audit-only / recommendation-only / evidence-only.
- Sprint 1-18 behavior does not regress.
