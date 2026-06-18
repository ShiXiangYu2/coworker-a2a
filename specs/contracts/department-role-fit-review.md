# Contract: DepartmentRoleFitReview

Status: proposed for Sprint 21

## Purpose

DepartmentRoleFitReview records local reviewer analysis of whether a DepartmentAgentRole fits a Task assignment proposal.

It is recommendation-only and must not assign runtime Agents.

## Fields

- `id: string`
- `targetSprint: 'sprint_21'`
- `baseline: 'sprint_1_20_complete'`
- `status: DepartmentAssignmentRecordStatus`
- `assignmentProposalId: string`
- `departmentProfileId: string`
- `roleId: string`
- `roleType: 'primary' | 'supporting' | 'reviewer' | 'escalation_owner'`
- `fitScore?: number`
- `fitLevel: 'weak' | 'partial' | 'good' | 'strong'`
- `fitRationale: string`
- `missingCapabilityNotes: string[]`
- `evidenceRefs: DepartmentAssignmentEvidenceRef[]`
- `recommendationOnly: true`
- `doesNotAssignRuntimeAgent: true`
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

- Fit review may recommend primary, supporting, reviewer, or escalation-owner roles for local review.
- Fit review must not assign runtime Agent.
- Fit review must not start AgentRun or route Task.
