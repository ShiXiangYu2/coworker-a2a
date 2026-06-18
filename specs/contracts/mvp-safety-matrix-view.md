# Contract: MVPSafetyMatrixView

Status: proposed for Sprint 16

## Purpose

MVPSafetyMatrixView is a read-only presentation of allowed display actions and denied runtime actions for the sealed Sprint 1-15 MVP.

It is a governance display only. It cannot grant permission, approve execution, approve release, deploy, publish, complete tasks, or authorize future actions.

## Fields

- `id: string`
- `matrixVersion: string`
- `targetSprint: 'sprint_16'`
- `baseline: 'sprint_1_15_complete_mvp_sealed'`
- `allowedDisplayActions: MVPSafeDisplayAction[]`
- `deniedRuntimeActions: MVPDeniedRuntimeAction[]`
- `tokenBoundary: MVPSafetyTokenBoundary`
- `kelvinBoundary: MVPKelvinDisplayBoundary`
- `evidenceRefs: string[]`
- `isReadOnly: true`
- `mutatesSourceRecords: false`
- `grantsPermission: false`
- `isExecutionToken: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isPublishToken: false`
- `isTaskCompletionToken: false`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`

## Safe Display Action

```ts
type MVPSafeDisplayAction =
  | 'view_mvp_demo_path'
  | 'view_record_chain'
  | 'view_safety_matrix'
  | 'view_readiness_summary'
  | 'view_audit_timeline'
  | 'view_linked_evidence'
  | 'view_local_review_status'
  | 'view_safety_boundary'
```

## Denied Runtime Action

```ts
type MVPDeniedRuntimeAction =
  | 'execute_agent'
  | 'execute_tool_run'
  | 'execute_workflow'
  | 'execute_step'
  | 'write_file'
  | 'apply_patch'
  | 'format_file'
  | 'run_shell'
  | 'run_git'
  | 'create_pr'
  | 'call_external_api'
  | 'connect_mcp'
  | 'create_webhook'
  | 'create_worker'
  | 'create_queue'
  | 'deploy'
  | 'publish'
  | 'release'
  | 'complete_task'
  | 'retry'
  | 'replay'
  | 'rollback'
  | 'restore'
  | 'resume_execution'
```

## Token Boundary

```ts
type MVPSafetyTokenBoundary = {
  approvedRecordIsExecutionToken: false
  approvedRecordIsReleaseToken: false
  approvedRecordIsDeployToken: false
  passedIsExecutionToken: false
  readinessIsReleaseToken: false
  readinessIsDeployToken: false
  evidenceRefsGrantPermission: false
}
```

## Kelvin Display Boundary

```ts
type MVPKelvinDisplayBoundary = {
  approvalMeaning: 'local_record_review_only'
  approvesFutureRecords: false
  executesAfterApproval: false
  completesTaskAfterApproval: false
  releasesAfterApproval: false
  deploysAfterApproval: false
}
```

## Rules

- MVPSafetyMatrixView must be read-only.
- MVPSafetyMatrixView must not grant permission.
- `allowedDisplayActions` must not include execution semantics.
- `deniedRuntimeActions` must include execution, release, deploy, publish, external, MCP, file, Git, PR, webhook, worker, queue, retry, replay, rollback, restore, resume, and task completion denials.
- `approved_record`, `passed`, readiness, RegressionGate, ReleaseReadinessChecklist, EvalRun, AuditEvent, and ObservabilityEvent are evidence only.
- MVPSafetyMatrixView must not mutate source records.

## Sprint 17 Evidence Import Safety Display

MVPSafetyMatrixView must show Sprint 17 evidence import denials:

- no file read.
- no directory read.
- no clipboard read.
- no command execution.
- no Git execution.
- no URL fetch.
- no external API call.
- no MCP connection.
- no live import.
- no source record mutation.

EvidenceImportRecord, SanitizedEvidenceSnapshot, EvidenceSourceProfile, EvidenceRedactionPolicy, and EvidenceReviewRecord cannot grant permission or act as execution, release, deploy, external access, or task completion tokens.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.

