# PRD: Sprint 10 - Production Hardening / Security / Deployment Readiness

Created: 2026-06-16
Status: proposed

## Problem

Sprint 1-9 established the core "Agent company" foundation:

- ChatHub MVP / SSE.
- CEO Agent Router.
- Harmony Task Engine.
- analysis-only Agent Runtime.
- Memory / Knowledge / local A2A draft.
- ToolCall proposal / Permission / CommandPolicy / Human Confirmation / Audit.
- Eval / Verification / Quality Gate.
- Observability / Audit Log / Recovery / Resume.
- local controlled Multi-Agent Collaboration / A2A Runtime records.

The system now has many local records, review flows, safety boundaries, and UI entry points. Before any future real Tool Runtime, File / Git / PR workflow, external integration, MCP connector, or deployment automation, the project needs a production hardening layer that makes safety, auth, redaction, audit, regression, and release readiness explicit and testable.

## Product Goal

Sprint 10 introduces a production readiness and security governance layer:

```text
Sprint 1-9 local records and runtime views
  -> SecurityPolicy
  -> AgentProfile
  -> AgentPermissionBoundary
  -> SkillIOContract
  -> ApiAuthBoundary
  -> SecretRedactionPolicy
  -> ProductionObservabilityPolicy
  -> RegressionGate
  -> ReleaseReadinessChecklist
  -> AuditEvent / ObservabilityEvent
  -> ChatHub / Task UI safety display
```

Sprint 10 does not introduce:

```text
real Agent execution
real Tool execution
shell / Git / file write / PR / deploy / delete
external API / MCP
automatic Task progression
automatic Memory / Knowledge approval
automatic A2A sending or dispatch
automatic Eval-driven blocking or completion
```

## Scope

Sprint 10 includes:

- SecurityPolicy contract.
- AgentProfile contract.
- AgentPermissionBoundary contract.
- SkillIOContract contract.
- ReleaseReadinessChecklist contract.
- RegressionGate contract.
- ApiAuthBoundary contract.
- SecretRedactionPolicy contract.
- ProductionObservabilityPolicy contract.
- Production security safety contract.
- updates to existing CommandPolicy, ToolPermission, AuditEvent, ObservabilityEvent, CorrelationId, RedactionPolicy, AgentRuntime, EvalRun, CollaborationSession, A2A collaboration safety, Memory / Knowledge / A2A safety, and Tool runtime safety contracts.
- ChatHub / Task UI safety entry design.
- acceptance criteria proving Sprint 1-9 behavior does not regress.

Sprint 10 does not include:

- Prisma schema changes.
- API implementation.
- Tool Runtime implementation.
- Sprint 11 Controlled Real Tool Runtime implementation.
- Sprint 12 File / Git / PR Workflow planning or implementation.
- Agent execution implementation.
- file mutation implementation.
- Git / PR / deploy implementation.
- external API or MCP integration.
- queue, worker, scheduler, webhook, or background execution.
- complete multi-user or tenant implementation.

## Current Implementation Target

Sprint 10 targets the current system state where Sprint 1-9 are implemented and Sprint 10 / Sprint 11 are not implemented yet.

Sprint 10 must harden and verify Sprint 1-9 only. Any Sprint 11 or Sprint 12 text in related contracts is future boundary context and must not be implemented as part of Sprint 10.

Recommended first implementation shape:

- static config or seed config for policies and profiles.
- read-only display APIs.
- local review record APIs only if needed.
- no new execution path.

## Claude CEO Agent Boundary

Claude may be used as the underlying model for the CEO Agent only within a constrained planning and coordination role.

Claude CEO may:

- understand Kelvin's goal.
- produce RouteDecision records.
- propose TaskDecomposition records.
- create local CollaborationPlan / CollaborationSession proposals.
- coordinate Jobs, Linus, Turing, and Bezos through local records.
- identify risks.
- request Kelvin review.
- propose ToolCall records.
- request Eval / Verification records.

Claude CEO must not:

- execute Tools.
- run shell commands.
- use Git.
- write files.
- create PRs.
- deploy.
- delete data.
- call external APIs.
- call MCP.
- send A2A messages.
- start AgentRuns.
- automatically approve Memory, Knowledge, ToolCall, Eval, A2A, or Collaboration records.
- mutate Task status to completed.
- bypass Kelvin, CommandPolicy, PermissionProfile, AgentPermissionBoundary, or Human Confirmation.

Claude CEO output must be schema-constrained and auditable.

## Required Safety Note

```text
Sprint 10 defines production hardening, security, auth, redaction, audit, regression, and release readiness records only. It does not execute Agents or Tools, call external APIs or MCP, run shell or Git commands, write files, create PRs, deploy, delete, or automatically advance Task, Memory, Eval, ToolCall, or A2A state.
```

## Allowed UI Labels

- `View Security Boundary`
- `View Agent Profile`
- `View Permission Boundary`
- `View Release Readiness`
- `View Regression Gate`
- `View Production Checklist`
- `View Audit Policy`
- `View Redaction Policy`
- `View Auth Boundary`
- `Request Kelvin Review`
- `Approve Local Record`

## Disallowed UI Labels

- `Execute`
- `Run Tool`
- `Start Agent`
- `Apply Change`
- `Create PR`
- `Deploy`
- `Dispatch`
- `Auto Fix`
- `Resume Execution`
- `Bypass Permission`
- `Send External Request`
- `Run Security Fix`
- `Auto Harden`

## Acceptance Criteria

- Sprint 10 specs define SecurityPolicy, AgentProfile, AgentPermissionBoundary, SkillIOContract, ReleaseReadinessChecklist, RegressionGate, ApiAuthBoundary, SecretRedactionPolicy, ProductionObservabilityPolicy, and ProductionSecuritySafety.
- Claude CEO is explicitly plan / route / coordinate / risk-assess only.
- Kelvin remains the final human authority for high-risk local record approval.
- CommandPolicy and PermissionProfile remain default-deny.
- Permission evaluation cannot approve records automatically.
- Kelvin approval changes local record state only and triggers no execution.
- Secrets and blocked payloads are never persisted into AuditEvent payloads, ObservabilityEvent payloads, RecoveryPoint snapshots, RunJournal entries, ResumeToken context, Eval evidence, Agent prompt context, Collaboration plan snapshots, or ToolCall policy snapshots.
- ApiAuthBoundary defines owner / operator / viewer / agent_record as the first role model without claiming complete multi-tenancy.
- RegressionGate covers Sprint 1-9.
- RegressionGate `targetSprint = sprint_10` covers Sprint 1-9 only in Sprint 10 implementation.
- ReleaseReadinessChecklist `targetSprint = sprint_10` covers Sprint 1-9 only in Sprint 10 implementation.
- Sprint 10 contracts contain no active Sprint 11 Tool Runtime implementation requirement.
- Sprint 10 contracts contain no active Sprint 12 File / Git / PR implementation requirement.
- No ToolExecutor, ToolExecutionPlan, ToolExecutionReceipt, GitOperation, FilePatch, PullRequestRun, DeployRun, ExternalApiCall, McpSession, Worker, Queue, AutoFix, or AutoRemediation model is introduced in Sprint 10.
- Audit role actorType does not grant permissions.
- Scoped SecurityPolicy cannot loosen global SecurityPolicy.
- ChatHub and Task UI expose safety and readiness views without execution wording.
- Sprint 1 ChatHub SSE does not regress.
- Sprint 2 Router does not regress.
- Sprint 3 Harmony Task Engine does not regress.
- Sprint 4 analysis-only Agent Runtime does not regress.
- Sprint 5 Memory / Knowledge / local A2A does not regress.
- Sprint 6 ToolCall proposal / Permission / CommandPolicy does not regress.
- Sprint 7 Eval / Verification / Quality Gate recommendation-only behavior does not regress.
- Sprint 8 Observability / Recovery / Resume view-only behavior does not regress.
- Sprint 9 local controlled Collaboration / A2A records do not regress.
