# Tasks: Sprint 18 - Department Agent Profiles

Status: proposed

## Specs

- [ ] Add Sprint 18 PRD.
- [ ] Add Sprint 18 plan.
- [ ] Add Sprint 18 tasks.

## Contracts

- [ ] Add DepartmentProfile contract.
- [ ] Add DepartmentAgentRole contract.
- [ ] Add DepartmentResponsibilityMatrix contract.
- [ ] Add DepartmentEscalationPolicy contract.
- [ ] Add DepartmentPermissionBoundary contract.
- [ ] Add DepartmentReviewRecord contract.
- [ ] Add Department profile state machine contract.
- [ ] Add Department Agent profile safety contract.

## Contract Updates

- [ ] Update AgentProfile and AgentTeam with department evidence-only linkage.
- [ ] Update Agent runtime and permission boundary safety with no continuation / no routing grants.
- [ ] Update Task contracts with no auto-route / no Task completed mutation.
- [ ] Update Audit and Observability events with department lifecycle events.
- [ ] Update Recovery and Resume with no rollback / restore / retry / replay / resume execution.
- [ ] Update Eval / RegressionGate / ReleaseReadiness with recommendation-only department checks.
- [ ] Update Tool / Workflow / External / Evidence / MVP console safety contracts with Sprint 18 boundaries.

## Acceptance Criteria

- [ ] Sprint 18 baseline is Sprint 1-17 complete.
- [ ] Department records are local organization records only.
- [ ] Department records cannot execute Agent, ToolRun, workflow, file, Git, external API, MCP, PR, deploy, publish, release, or Task completion.
- [ ] Department records cannot auto-route, auto-delegate, continue Agent, or grant runtime permission.
- [ ] Kelvin approval only approves one local department record.
- [ ] Department state machine contains no forbidden runtime states.
- [ ] APIs are local record lifecycle and linked query only.
- [ ] All department records have consistent token blockers.
- [ ] All department record lifecycle APIs are local-only.
- [ ] Superseded state has supersede refs.
- [ ] No Agent router automatic routing is introduced.
- [ ] No runtime permission can be granted by DepartmentPermissionBoundary.
- [ ] UI avoids forbidden execution and routing labels.
- [ ] Observability / Audit / Recovery / Resume / Eval / RegressionGate / ReleaseReadiness remain evidence-only or view-only.
- [ ] Sprint 1-17 behavior does not regress.
