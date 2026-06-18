# Plan: Sprint 19 - Department-Aware Operator Review / Evidence-to-Department Mapping

Status: proposed
Baseline: Sprint 1-18 complete

## Objective

Add specs for a local, auditable evidence-to-department mapping layer that connects Sprint 17 sanitized evidence with Sprint 18 Department records without adding runtime execution, automatic routing, runtime permission, or live import capability.

## Workstreams

1. Mapping, coverage, gap, and review record contracts.
2. Mapping state machine and safety contract.
3. Sprint 1-18 sanitized evidence reference model.
4. Local mapping API design.
5. ChatHub / Task / Operator Console mapping presentation design.
6. Audit and Observability event design.
7. Recovery / Resume no-execution boundary.
8. Eval / RegressionGate / ReleaseReadiness acceptance design.
9. Cross-contract boundary updates.

## Implementation Boundary

Sprint 19 specs may describe future local APIs and records, but this specs landing sprint must not implement:

- Prisma schema.
- API routes.
- UI components.
- Agent runtime.
- Agent router.
- Tool runtime.
- workflow runtime.
- file / Git / PR actions.
- external API / MCP actions.
- live evidence import or sync.
- deploy / publish / release.
- retry / replay / rollback / restore / resume execution.

## Local Mapping Lifecycle

All Sprint 19 mapping records share a consistent local lifecycle:

- create.
- query.
- submit-review.
- approve-record.
- reject.
- supersede.
- archive.

This applies to:

- EvidenceToDepartmentMappingRecord.
- DepartmentEvidenceCoverageRecord.
- DepartmentReviewGapRecord.
- DepartmentMappingReviewRecord.

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

All superseded records must include supersede refs and reason metadata.

## Shared Token Blockers

Every Sprint 19 mapping record must include:

- `isExecutionToken: false`
- `isRoutingToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isTaskCompletionToken: false`
- `grantsRuntimePermission: false`
- `mutatesSourceRecords: false`

Implementations must validate these blockers as fixed false values.

## Safety Rules

- Mapping records are not execution handles.
- Mapping records are not routing handles.
- Mapping records are not runtime permission grants.
- Mapping records do not import live evidence.
- Mapping records do not approve future behavior.
- Mapping evidence refs are sanitized evidence only.
- Operator Console mapping display is read-only unless a future Sprint 19 implementation explicitly creates local mapping records through reviewed APIs.

## Acceptance

Sprint 19 specs are ready for review when:

- All new Sprint 19 specs files exist.
- All new mapping contracts exist.
- Existing contracts include Sprint 19 evidence-only / no-runtime boundary notes.
- API and UI designs are local-record-only.
- Forbidden states and labels are documented.
- Eval / RegressionGate / ReleaseReadiness remain evidence-only.
- Sprint 1-18 behavior does not regress.
