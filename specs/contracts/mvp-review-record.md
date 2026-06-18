# Contract: MVPReviewRecord

Status: proposed for Sprint 15

## Purpose

MVPReviewRecord captures a human review decision for a local Sprint 15 readiness, demo, or governance summary record. It does not execute, release, deploy, publish, or complete work.

## Fields

- `id: string`
- `targetType: 'mvp_readiness_record' | 'demo_scenario_record' | 'governance_summary_record'`
- `targetId: string`
- `targetSprint: 'sprint_15'`
- `status: 'draft' | 'review' | 'approved_record' | 'rejected' | 'archived'`
- `reviewer: 'kelvin' | 'owner' | 'operator'`
- `verdict: 'needs_changes' | 'approved_record' | 'rejected'`
- `reviewNotes: string`
- `confirmationArtifactId?: string`
- `doesNotExecute: true`
- `doesNotRelease: true`
- `doesNotDeploy: true`
- `doesNotCompleteTask: true`
- `createdBy: 'user' | 'operator' | 'system_seed'`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`
- `archivedAt?: string`

## Rules

- MVPReviewRecord can approve or reject only the referenced local record.
- Approval changes local record state only.
- Approval must not trigger release, deploy, publish, execution, task completion, or future automatic approvals.
- Review records must not mutate source evidence records.
- `confirmationArtifactId` may point to a local Kelvin confirmation artifact, but the artifact remains evidence only.

## Sprint 16 Display Boundary

Sprint 16 MVPOperatorConsole may display MVPReviewRecord as local review evidence only.

- Displaying MVPReviewRecord must not re-approve, replay, retry, rollback, restore, or resume anything.
- `verdict: 'approved_record'` remains a local review verdict only.
- MVPReviewRecord must not become an execution, release, deploy, publish, or task completion token in Sprint 16 console views.
