# Contract: DepartmentTaskIntakeRecord

Status: proposed for Sprint 21

## Purpose

DepartmentTaskIntakeRecord captures a local review intake for deciding which Department and DepartmentAgentRole should own a Task.

It is not a routing token, runtime assignment token, AgentRun trigger, ToolRun trigger, workflow trigger, permission grant, deploy/release token, or Task completion token.

## Fields

- `id: string`
- `targetSprint: 'sprint_21'`
- `baseline: 'sprint_1_20_complete'`
- `status: DepartmentAssignmentRecordStatus`
- `sourceTaskId: string`
- `taskTitle: string`
- `taskSummary: string`
- `taskType?: string`
- `intakeReason: string`
- `intakeSource: 'operator' | 'kelvin' | 'system_record' | 'manual_review'`
- `candidateDepartmentProfileIds: string[]`
- `candidateRoleIds: string[]`
- `sanitizedEvidenceRefs: DepartmentAssignmentEvidenceRef[]`
- `riskNotes: string[]`
- `assignmentProposalRefs: string[]`
- `roleFitReviewRefs: string[]`
- `approvalRecordRefs: string[]`
- `auditRecordRefs: string[]`
- `isExecutionToken: false`
- `isRoutingToken: false`
- `isAssignmentToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isTaskCompletionToken: false`
- `grantsRuntimePermission: false`
- `mutatesSourceRecords: false`
- `executesAgent: false`
- `continuesAgent: false`
- `routesTask: false`
- `autoRoutesTask: false`
- `assignsRuntimeAgent: false`
- `startsAgentRun: false`
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
- `createdAt: string`
- `updatedAt: string`

## Rules

- Create / query / submit-review / approve-record / reject / supersede / archive only.
- Approval changes only this local intake record status.
- Candidate departments and roles are review candidates only.
- The record must not mutate the source Task or mark it assigned, routed, delegated, running, completed, or resumed.
