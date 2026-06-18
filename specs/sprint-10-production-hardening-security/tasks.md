# Tasks: Sprint 10 - Production Hardening / Security / Deployment Readiness

Status: proposed

## Phase 1 - Specs

- [ ] Add Sprint 10 PRD, plan, and tasks.
- [ ] Add `security-policy.md`.
- [ ] Add `agent-profile.md`.
- [ ] Add `agent-permission-boundary.md`.
- [ ] Add `skill-io-contract.md`.
- [ ] Add `release-readiness-checklist.md`.
- [ ] Add `regression-gate.md`.
- [ ] Add `api-auth-boundary.md`.
- [ ] Add `secret-redaction-policy.md`.
- [ ] Add `production-observability-policy.md`.
- [ ] Add `production-security-safety.md`.
- [ ] Update Sprint 1-9 cross-cutting contracts with Sprint 10 boundaries.

## Phase 2 - Type and Rule Design

- [ ] Add TypeScript types for Sprint 10 contracts.
- [ ] Add pure validation rules for SecurityPolicy default-deny.
- [ ] Add pure validation rules for AgentPermissionBoundary.
- [ ] Add pure validation rules for SkillIOContract side-effect-free outputs.
- [ ] Add pure validation rules for ReleaseReadinessChecklist.
- [ ] Add pure validation rules for RegressionGate coverage.
- [ ] Add pure validation rules for ApiAuthBoundary roles.
- [ ] Add redaction / blocked payload validation for production surfaces.

## Phase 3 - Persistence Review

- [ ] Decide which Sprint 10 contracts require Prisma tables.
- [ ] Prefer static config / seed config for the first Sprint 10 implementation unless schema review explicitly approves tables.
- [ ] Confirm no execution, worker, queue, deployment, external API, MCP, file write, Git, PR, or auto-fix tables are added.
- [ ] Confirm no ToolExecutor, ToolExecutionPlan, ToolExecutionReceipt, FilePatch, GitOperation, PullRequestRun, DeployRun, ExternalApiCall, McpSession, Worker, Queue, AutoFix, or AutoRemediation model is added.
- [ ] Confirm existing Sprint 1-9 data remains compatible.

## Phase 4 - API Design

- [ ] Add read APIs for SecurityPolicy.
- [ ] Add read APIs for AgentProfile and AgentPermissionBoundary.
- [ ] Add read APIs for SkillIOContract.
- [ ] Add read and local review APIs for ReleaseReadinessChecklist.
- [ ] Add read APIs for RegressionGate.
- [ ] Add read APIs for ApiAuthBoundary.
- [ ] Ensure all local record mutations return `auditEvents` and/or `observabilityEvents`.
- [ ] Ensure no Sprint 10 API route path contains execution semantics except existing record-query terms from earlier sprints.

## Phase 5 - UI Design

- [ ] Add ChatHub `View Security Boundary`.
- [ ] Add ChatHub `View Production Checklist`.
- [ ] Add Agent card `View Agent Profile`.
- [ ] Add Agent card `View Permission Boundary`.
- [ ] Add Task detail `Release Readiness`.
- [ ] Add Task detail `Regression Gate`.
- [ ] Add ToolCall / Eval / Collaboration cards `View Permission Boundary`.
- [ ] Display Sprint 10 safety note.
- [ ] Remove or reject misleading labels: `Execute`, `Run Tool`, `Start Agent`, `Apply Change`, `Create PR`, `Deploy`, `Dispatch`, `Auto Fix`, `Resume Execution`, `Bypass Permission`.

## Phase 6 - Tests

- [ ] SecurityPolicy default decision is deny.
- [ ] AgentPermissionBoundary forbids execution capabilities in Sprint 10.
- [ ] Claude CEO can only plan / route / coordinate / risk assess / propose local records.
- [ ] SkillIOContract has `allowedSideEffects = none`.
- [ ] Permission evaluation cannot approve records automatically.
- [ ] Kelvin approval does not execute or mutate unrelated target records.
- [ ] ReleaseReadinessChecklist approval does not deploy.
- [ ] RegressionGate pass / fail / blocked does not mutate Sprint 1-9 resources.
- [ ] Blocked payloads are not persisted into AuditEvent, ObservabilityEvent, RecoveryPoint, RunJournal, ResumeToken, Eval evidence, Agent prompt, Collaboration plan snapshot, or ToolCall policy snapshot.
- [ ] API route forbidden semantics are rejected.
- [ ] UI forbidden labels are absent.
- [ ] Sprint 1 `/api/chat` SSE regression.
- [ ] Sprint 2 Router regression.
- [ ] Sprint 3 Harmony Task Engine regression.
- [ ] Sprint 4 Agent Runtime regression.
- [ ] Sprint 5 Memory / Knowledge / local A2A regression.
- [ ] Sprint 6 ToolCall proposal / Permission / CommandPolicy regression.
- [ ] Sprint 7 Eval / Verification / Quality Gate regression.
- [ ] Sprint 8 Observability / Recovery / Resume regression.
- [ ] Sprint 9 Multi-Agent Collaboration / A2A Runtime regression.
- [ ] `claude_ceo` and `elon` cannot both be active CEO execution identities.
- [ ] Existing `elon` CEO records map explicitly to `modelIdentity = 'claude_ceo'` or `personaAlias = 'elon'`.
- [ ] Audit role actorType does not grant permissions.
- [ ] Scoped SecurityPolicy cannot loosen global SecurityPolicy.
- [ ] SkillIOContract `tooling` category does not execute tools.
- [ ] SkillIOContract is not usable as ToolDefinition or ToolExecutor.
- [ ] ReleaseReadiness `approved_record` is not an execution token.
- [ ] RegressionGate `passed` is not an execution token.
- [ ] `release-readiness` and `regression-gate` API results are not consumed by execution paths.
- [ ] Sprint 10 contracts contain no active Sprint 11 Tool Runtime implementation requirement.
- [ ] Sprint 10 contracts contain no active Sprint 12 File / Git / PR implementation requirement.
- [ ] RegressionGate `targetSprint = sprint_10` covers Sprint 1-9 only.
- [ ] ReleaseReadinessChecklist `targetSprint = sprint_10` covers Sprint 1-9 only.
- [ ] API auth roles are role attribution, route guard, and UI visibility only, not permission grants.

## Non-goals

- [ ] Do not implement real Tool Runtime.
- [ ] Do not implement Sprint 11 Controlled Real Tool Runtime.
- [ ] Do not process Sprint 12 File / Git / PR Workflow.
- [ ] Do not execute Agents.
- [ ] Do not execute Tools.
- [ ] Do not call external API or MCP.
- [ ] Do not run shell or Git.
- [ ] Do not write files.
- [ ] Do not create PRs.
- [ ] Do not deploy.
- [ ] Do not delete data.
- [ ] Do not auto-advance Task, AgentRun, ToolCall, Memory, Eval, A2A, or Collaboration states.
- [ ] Do not enter Sprint 11.
