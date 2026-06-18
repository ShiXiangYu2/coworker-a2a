# Contract: DepartmentAssignmentProposal

Status: proposed for Sprint 21

## Purpose

DepartmentAssignmentProposal records a local recommendation that a Task should be owned by a Department and primary DepartmentAgentRole, with optional supporting roles.

It is recommendation-only and local-review-only. It must not assign runtime Agents or route Tasks.

## Fields

- `id: string`
- `targetSprint: 'sprint_21'`
- `baseline: 'sprint_1_20_complete'`
- `status: DepartmentAssignmentRecordStatus`
- `intakeRecordId: string`
- `sourceTaskId: string`
- `proposedDepartmentProfileId: string`
- `proposedPrimaryRoleId: string`
- `proposedSupportingRoleIds: string[]`
- `assignmentRationale: string`
- `responsibilitySummary: string`
- `evidenceCoverageSummary: string`
- `riskSummary: string`
- `escalationPolicyRef?: string`
- `permissionBoundaryRef?: string`
- `roleFitReviewRefs: string[]`
- `approvalRecordRefs: string[]`
- `auditRecordRefs: string[]`
- `sanitizedEvidenceRefs: DepartmentAssignmentEvidenceRef[]`
- `assignmentRecommendationOnly: true`
- `localReviewOnly: true`
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

- A proposal is not an Agent router decision.
- A proposal is not runtime assignment.
- `approved_record` means the proposal record was reviewed only.
- It must not start AgentRun, assign runtime Agent, execute ToolRun, execute workflow, grant permission, or complete Task.
