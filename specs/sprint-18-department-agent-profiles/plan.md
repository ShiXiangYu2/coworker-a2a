# Plan: Sprint 18 - Department Agent Profiles

Status: proposed
Baseline: Sprint 1-17 complete

## Objective

Add specs for a local, auditable organization layer that models departments, Agent roles, responsibilities, escalation policies, permission boundaries, and review records without adding runtime execution or automatic routing.

## Workstreams

1. Department record contracts.
2. Department state machine and safety contract.
3. Sprint 1-17 sanitized evidence reference model.
4. Local department API design.
5. ChatHub / Task / Operator Console department presentation design.
6. Audit and Observability event design.
7. Recovery / Resume no-execution boundary.
8. Eval / RegressionGate / ReleaseReadiness acceptance design.
9. Cross-contract boundary updates.

## Implementation Boundary

Sprint 18 specs may describe future local APIs and records, but this specs landing sprint must not implement:

- Prisma schema.
- API routes.
- UI components.
- Agent runtime.
- Tool runtime.
- workflow runtime.
- file / Git / PR actions.
- external API / MCP actions.
- deploy / publish / release.
- retry / replay / rollback / restore / resume execution.

## Department Record Lifecycle

All Sprint 18 Department records share a consistent local lifecycle:

- create.
- query.
- submit-review.
- approve-record.
- reject.
- supersede.
- archive.

This applies to:

- DepartmentProfile.
- DepartmentAgentRole.
- DepartmentResponsibilityMatrix.
- DepartmentEscalationPolicy.
- DepartmentPermissionBoundary.
- DepartmentReviewRecord.

Allowed statuses:

- `draft`
- `review`
- `approved_record`
- `rejected`
- `superseded`
- `archived`

Allowed transitions:

- `draft -> review`
- `draft -> archived`
- `review -> approved_record`
- `review -> rejected`
- `review -> archived`
- `approved_record -> superseded`
- `approved_record -> archived`
- `rejected -> archived`
- `superseded -> archived`

All superseded records must include:

- `supersedesRecordId?: string`
- `supersededByRecordId?: string`
- `supersededAt?: string`
- `supersedeReason?: string`

All reviewed and archived records must include:

- `reviewedBy?: string`
- `reviewedAt?: string`
- `archivedAt?: string`

## Unified Token Blockers

Every Sprint 18 Department record must include:

- `isExecutionToken: false`
- `isRoutingToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isTaskCompletionToken: false`
- `grantsRuntimePermission: false`
- `mutatesSourceRecords: false`

Implementations must validate these blockers as fixed false values. They are not user-configurable permissions.

## Safety Rules

- Department records are not execution handles.
- Department records are not routing handles.
- Department records are not runtime permission grants.
- DepartmentPermissionBoundary is not consumed by the runtime permission system.
- Department records do not approve future behavior.
- DepartmentReviewRecord approval approves only one referenced local Department record.
- Department evidence refs are sanitized evidence only.
- Operator Console department display is read-only unless a future Sprint 18 implementation explicitly creates local department records through reviewed APIs.

## Acceptance

Sprint 18 specs are ready for review when:

- All new Sprint 18 specs files exist.
- All new department contracts exist.
- Existing contracts include Sprint 18 evidence-only / no-runtime boundary notes.
- API and UI designs are local-record-only.
- All Department records have consistent token blockers.
- All Department lifecycle APIs are local-only.
- Superseded state requires supersede refs and reason metadata.
- No Agent router automatic routing is introduced.
- No runtime permission can be granted by DepartmentPermissionBoundary.
- Forbidden states and labels are documented.
- Eval / RegressionGate / ReleaseReadiness remain evidence-only.
