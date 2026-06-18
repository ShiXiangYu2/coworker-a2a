# Contract: ExecutionGateRecord

Status: proposed for Sprint 20

## Purpose

ExecutionGateRecord captures a human review gate for one local intent or plan.

## Fields

- `id: string`
- `targetSprint: 'sprint_20'`
- `baseline: 'sprint_1_19_complete'`
- `intentRecordId?: string`
- `planRecordId?: string`
- `status: ExecutionGatewayRecordStatus`
- `gateName: string`
- `gateSummary: string`
- `gateDecision: 'pending_review' | 'approved_record' | 'rejected'`
- `requiredReviewer: 'kelvin' | 'operator' | 'owner'`
- `requiredEvidenceRefs: ExecutionEvidenceRef[]`
- `blockedReasons: string[]`
- `approvalMeaning: 'local_execution_record_review_only'`
- `doesNotGrantRuntimePermission: true`
- `approvalRecordRefs: string[]`
- `receiptRecordRefs: string[]`
- `isExecutionToken: false`
- `isRoutingToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isTaskCompletionToken: false`
- `grantsRuntimePermission: false`
- `mutatesSourceRecords: false`
- `executesAgent: false`
- `continuesAgent: false`
- `routesTask: false`
- `assignsAgent: false`
- `executesToolRun: false`
- `executesWorkflow: false`
- `writesFile: false`
- `runsGit: false`
- `callsExternalApi: false`
- `connectsMcp: false`
- `createsPr: false`
- `deploysOrReleases: false`
- `completesTask: false`
- `createdBy: string`
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

- A gate is a review record only.
- `status` is the local lifecycle state.
- `gateDecision` is the human review interpretation only.
- A gate decision must not be consumed by runtime permission systems.
- A gate must not execute or unlock execution.

## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
