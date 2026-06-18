# Sprint 21 Plan

## Objective

Add Department Task Intake / Assignment Review specs as the final local governance loop before v1 project closure.

Sprint 21 bridges:

```text
Task
-> Department Task Intake
-> Department Assignment Proposal
-> Role Fit Review
-> Assignment Approval
-> Assignment Audit / Timeline
```

It does not bridge to runtime routing, runtime assignment, Agent execution, ToolRun execution, workflow execution, file/Git/PR actions, external/MCP actions, deployment, release, or Task completion.

## Phase 1: Specs

- Define Sprint 21 PRD.
- Define DepartmentAssignmentRecordStatus and state machine.
- Define DepartmentAssignmentEvidenceRef.
- Define DepartmentTaskIntakeRecord.
- Define DepartmentAssignmentProposal.
- Define DepartmentRoleFitReview.
- Define DepartmentAssignmentApprovalRecord.
- Define DepartmentAssignmentAuditRecord.
- Define safety invariants and forbidden semantics.
- Define API, UI, audit, observability, recovery, resume, eval, RegressionGate, and ReleaseReadiness boundaries.

## Phase 2: Specs Review

Review for:

- Sprint 1-20 complete baseline.
- local task intake / assignment proposal / role fit review / approval / audit records only.
- sanitized evidence and local review references only.
- no execution, routing, runtime assignment, runtime permission, release, deploy, or Task completion token.
- Kelvin approval single-local-record-only.
- no forbidden states.
- no forbidden UI labels.
- no forbidden API semantics.
- no Sprint 1-20 regression.

## Phase 3: Implementation, Later Only After Approval

If Sprint 21 specs pass review, implementation may add:

- local Prisma models.
- `src/lib/department-assignment` types, state machine, validators, repository.
- local APIs.
- Operator Console panel.
- tests.

Implementation must remain local-record-only unless a future reviewed Sprint explicitly introduces runtime dispatch.

## Phase 4: Closure

After implementation and final review, Sprint 21 may close the v1 Agent company governance prototype:

```text
Task intake
-> Department assignment review
-> Department evidence
-> Human-gated execution intent
-> Audit / observability / eval
```

This closure does not claim full autonomous execution.
