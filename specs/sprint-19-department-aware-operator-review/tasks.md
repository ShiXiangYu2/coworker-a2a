# Tasks: Sprint 19 - Department-Aware Operator Review / Evidence-to-Department Mapping

Status: proposed

## Specs

- [ ] Add Sprint 19 PRD.
- [ ] Add Sprint 19 plan.
- [ ] Add Sprint 19 tasks.

## Contracts

- [ ] Add EvidenceToDepartmentMappingRecord contract.
- [ ] Add DepartmentEvidenceCoverageRecord contract.
- [ ] Add DepartmentReviewGapRecord contract.
- [ ] Add DepartmentMappingReviewRecord contract.
- [ ] Add Department evidence mapping state machine contract.
- [ ] Add Department evidence mapping safety contract.

## Contract Updates

- [ ] Update EvidenceImportRecord and SanitizedEvidenceSnapshot with Sprint 19 mapping-reference-only linkage.
- [ ] Update Evidence Import safety with no live import / no sync boundary.
- [ ] Update Department contracts with mapping-reference-only linkage.
- [ ] Update Department Agent Profile safety with no routing / no permission grants from mapping.
- [ ] Update Operator Console contract with mapping panel entry.
- [ ] Update Audit and Observability events with mapping lifecycle events.
- [ ] Update Recovery and Resume with no rollback / restore / retry / replay / resume execution.
- [ ] Update Eval / RegressionGate / ReleaseReadiness with recommendation-only mapping checks.
- [ ] Update SecurityPolicy with no runtime permission grant from mapping records.

## Acceptance Criteria

- [ ] Sprint 19 baseline is Sprint 1-18 complete.
- [ ] Mapping records are local review records only.
- [ ] Mapping records cannot execute Agent, ToolRun, workflow, file, Git, external API, MCP, PR, deploy, publish, release, or Task completion.
- [ ] Mapping records cannot auto-route, assign Agent, continue Agent, import live evidence, sync evidence, or grant runtime permission.
- [ ] Kelvin approval only approves one local mapping / coverage / gap / review record.
- [ ] Mapping state machine contains no forbidden runtime states.
- [ ] APIs are local record lifecycle and linked query only.
- [ ] UI avoids forbidden execution, routing, permission, live import, and sync labels.
- [ ] Observability / Audit / Recovery / Resume / Eval / RegressionGate / ReleaseReadiness remain evidence-only or view-only.
- [ ] Sprint 1-18 behavior does not regress.
