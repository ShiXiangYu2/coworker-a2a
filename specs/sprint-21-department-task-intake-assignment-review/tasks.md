# Sprint 21 Tasks

## Specs Tasks

- [ ] Add Sprint 21 PRD.
- [ ] Add Sprint 21 plan.
- [ ] Add Sprint 21 tasks.
- [ ] Add DepartmentTaskIntakeRecord contract.
- [ ] Add DepartmentAssignmentProposal contract.
- [ ] Add DepartmentRoleFitReview contract.
- [ ] Add DepartmentAssignmentApprovalRecord contract.
- [ ] Add DepartmentAssignmentAuditRecord contract.
- [ ] Add Department Assignment state machine contract.
- [ ] Add Department Assignment safety contract.
- [ ] Update Task, Agent Runtime, Department, Department Evidence Mapping, Execution Gateway, Audit, Observability, Recovery, Resume, Eval, RegressionGate, ReleaseReadiness, Security, and Operator Console contracts with Sprint 21 boundary notes.

## Review Tasks

- [ ] Verify Sprint 21 starts from Sprint 1-20 complete.
- [ ] Verify Sprint 21 is the final governance-loop sprint before v1 project closure.
- [ ] Verify all records are local task intake / assignment / role fit / approval / audit records only.
- [ ] Verify Sprint 1-20 records are sanitized evidence or local review references only.
- [ ] Verify no record is an execution, routing, runtime assignment, permission, release, deploy, or Task completion token.
- [ ] Verify Kelvin approval approves only one local assignment record.
- [ ] Verify no future assignment approval semantics.
- [ ] Verify state machine allows only draft / review / approved_record / rejected / superseded / archived.
- [ ] Verify forbidden runtime states are absent.
- [ ] Verify API design is local create / query / submit-review / approve-record / reject / supersede / archive / linked query only.
- [ ] Verify all Sprint 21 records have consistent lifecycle metadata.
- [ ] Verify DepartmentAssignmentAuditRecord uses full local lifecycle or is explicitly append-only.
- [ ] Verify DepartmentAssignmentAuditRecord approval cannot grant runtime assignment.
- [ ] Verify no Agent router automatic routing is introduced.
- [ ] Verify no runtime Agent assignment is introduced.
- [ ] Verify no runtime permission can be granted.
- [ ] Verify no live execution API semantics are introduced.
- [ ] Verify forbidden UI labels are absent.

## Later Implementation Acceptance Tasks

- [ ] all assignment records have consistent local lifecycle.
- [ ] all Sprint 21 records have consistent lifecycle metadata.
- [ ] DepartmentAssignmentAuditRecord lifecycle is full local lifecycle or explicitly append-only.
- [ ] all assignment records have explicit token blockers.
- [ ] all assignment records have explicit assignment/runtime blockers.
- [ ] DepartmentAssignmentEvidenceRef is sanitized evidence only.
- [ ] Sprint 1-20 records are local review references only.
- [ ] DepartmentAssignmentProposal is recommendation-only and does not route tasks.
- [ ] DepartmentRoleFitReview is recommendation-only and does not assign runtime Agent.
- [ ] DepartmentAssignmentApprovalRecord approval only changes one local record status.
- [ ] DepartmentAssignmentAuditRecord does not mutate source Task.
- [ ] DepartmentAssignmentAuditRecord does not mutate assignment target.
- [ ] no runtime assignment can be granted by audit approval.
- [ ] no Agent router automatic routing is introduced.
- [ ] no runtime assignment is introduced.
- [ ] no runtime permission is granted.
- [ ] no live execution API semantics are introduced.
- [ ] no Task completed mutation.
- [ ] forbidden API semantics absent.
- [ ] forbidden UI labels absent.
- [ ] Sprint 1-20 regression passes.
