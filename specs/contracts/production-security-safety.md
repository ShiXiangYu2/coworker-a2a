# Contract: Production Security Safety

Status: proposed for Sprint 10

## Purpose

ProductionSecuritySafety defines the Sprint 10 non-execution safety boundary across production hardening, auth, redaction, observability, release readiness, and regression gates.

## Sprint 10 Boundary

Sprint 10 may define and later implement:

- security policy records.
- agent profile records.
- agent permission boundary records.
- skill I/O contract records.
- release readiness records.
- regression gate records.
- auth boundary records.
- redaction policy records.
- production observability policy records.
- UI displays for the above.
- audit and observability records for local review mutations.

Sprint 10 must not define or implement:

- real Agent execution.
- real Tool execution.
- shell execution.
- Git execution.
- file write, patch, formatting, or delete.
- PR creation, push, merge, or review automation.
- deploy, release, publish, or infrastructure changes.
- external API calls.
- MCP calls.
- browser automation.
- A2A dispatch.
- autonomous loops.
- automatic recovery execution.
- auto-fix.
- permission bypass.

## Forbidden Records

Do not add Sprint 10 tables, models, contracts, or API resources named or behaving like:

- ToolExecutor
- ToolExecutionPlan
- ToolExecutionReceipt
- ToolExecutionWorker
- AgentExecutionWorker
- SecurityAutoFixRun
- PolicyBypassToken
- DeployJob
- ExternalSecurityScanner
- SecretSyncJob
- GitOperation
- FilePatch
- PullRequestRun
- McpSession
- ExternalApiCall
- QueueJob
- Worker
- Queue
- AutoRemediationRun
- BrowserSession
- ShellSession

## Human Confirmation Boundary

Kelvin approval in Sprint 10 may:

- approve local security policy records.
- approve release readiness local records.
- approve high-risk local review records.
- reject local records.
- request revision.

Kelvin approval in Sprint 10 must not:

- execute Agents.
- execute Tools.
- start AgentRun.
- create executable ToolRun.
- mutate files.
- run Git.
- create PR.
- deploy.
- delete.
- call external API or MCP.
- dispatch A2A.
- complete Task.
- approve Memory / Knowledge automatically.

## UI Safety Copy

Required copy:

```text
Sprint 10 is a production hardening and security readiness layer. It displays policies, permission boundaries, release readiness, regression gates, audit, and observability records only. It does not execute Agents or Tools, call external APIs or MCP, write files, run Git, create PRs, deploy, delete, or bypass Kelvin.
```

## Acceptance Criteria

- No Sprint 10 API route implies execution semantics.
- No Sprint 10 UI label implies execution semantics.
- No Sprint 10 contract grants execution capability.
- No Sprint 10 approval triggers side effects.
- No Sprint 10 readiness record deploys or starts runtime.
- No Sprint 10 regression record mutates target status.
- No Sprint 10 security record bypasses CommandPolicy, SecurityPolicy, AgentPermissionBoundary, or Kelvin.

## Sprint 11 Controlled Tool Runtime Boundary

Future boundary only, not implemented in Sprint 10.

Sprint 11 may introduce controlled real Tool Runtime, but only under a new ToolExecutionPolicy, ToolSandbox, ToolExecutionPlan, ToolExecutionReceipt, and ToolRun execution state machine.

Production security remains responsible for denying:

- shell.
- Git.
- real file read.
- file write, patch, format, or delete.
- PR.
- deploy.
- database migration.
- external API.
- MCP.
- browser automation.
- retry, replay, rollback, or resume execution.
- Agent continuation.
- automatic future approval.

ReleaseReadinessChecklist and RegressionGate remain evidence and recommendation records only. They must not become execution tokens.

SecurityPolicy may allow the single Sprint 11 action `execute-approved` only for a specific approved ToolRun when ToolExecutionPolicy, ToolSandbox, ToolPermission, ToolExecutionPlan, RecoveryPoint, and required Kelvin confirmation are all satisfied.

Sprint 11 must not weaken AgentPermissionBoundary. Agents still cannot execute tools or start AgentRuns.

## Sprint 12 File / Git / PR Proposal Boundary

Future boundary only, not implemented in Sprint 10.

Sprint 12 may introduce File / Git / PR proposal records, but production security remains responsible for denying:

- real workspace file reads.
- file writes.
- patch application.
- formatting.
- shell.
- Git.
- commit, push, merge, checkout, or rebase.
- PR creation.
- deploy.
- delete.
- external API.
- MCP.
- browser automation.
- retry, replay, rollback, or resume execution.
- Agent continuation.
- Task completion.
- automatic future approval.

ReleaseReadinessChecklist and RegressionGate remain evidence and recommendation records only. They must not become file write, Git, PR, deploy, or delete tokens.

SecurityPolicy may allow local File / Git / PR proposal record actions only. It must not introduce a Sprint 12 execution exception.

## Sprint 13 External / MCP Governance Boundary

Future boundary only, not implemented in Sprint 10.

Sprint 13 may introduce External / MCP governance records, but production security remains responsible for denying:

- external API calls.
- MCP connections and MCP tool invocation.
- network requests.
- webhook creation or dispatch.
- worker, queue, or background job creation.
- email, chat, message, webhook, notification, or integration event sending.
- external system reads.
- external schema fetches.
- external system writes.
- shell.
- Git.
- file writes, patches, formatting, or deletes.
- PR creation.
- deploy.
- retry, replay, rollback, or resume execution.
- Agent continuation.
- ToolRun execution.
- Task completion.
- automatic future approval.

ReleaseReadinessChecklist and RegressionGate remain evidence and recommendation records only. They must not become external API, MCP, webhook, message sending, worker, queue, external read, or external write tokens.

SecurityPolicy may allow local External / MCP governance record actions only. It must not introduce a Sprint 13 execution exception.
## Sprint 14 Workflow Orchestration Boundary

Sprint 14 may introduce local workflow orchestration records, but production security remains responsible for denying execution paths.

Production safety must deny workflow execution, step execution, Agent continuation, ToolRun execution, file write, Git execution, external API call, MCP connection, PR creation, deploy, Task completion, retry, replay, rollback, and resume execution.

SecurityPolicy may allow local WorkflowProposal, WorkflowStepRecord, WorkflowDependencyGraph, WorkflowReviewRecord, and WorkflowReadinessAssessment record actions only.
## Sprint 15 MVP Closure Production Safety Boundary

Sprint 15 MVP closure records must preserve Sprint 10 production hardening boundaries and all Sprint 1-14 safety constraints.

Sprint 15 must not introduce production execution, deployment, publishing, release, auto-fix, auto-remediation, external calls, MCP connections, file writes, Git operations, PR creation, workers, queues, retries, replays, rollbacks, resumes, Agent execution, ToolRun execution, workflow execution, or Task completion.

MVPReadinessRecord, DemoScenarioRecord, GovernanceSummaryRecord, and MVPReviewRecord are local production readiness evidence only.

## Sprint 16 MVP Demo Polish Production Safety Boundary

Sprint 16 MVP demo polish and operator console views must preserve Sprint 10 production hardening boundaries and all Sprint 1-15 safety constraints.

Sprint 16 must not introduce production execution, deployment, publishing, release, auto-fix, auto-remediation, external calls, MCP connections, file writes, Git operations, PR creation, workers, queues, retries, replays, rollbacks, restores, resumes, Agent execution, ToolRun execution, workflow execution, or Task completion.

MVPOperatorConsole, MVPRecordChainView, and MVPSafetyMatrixView are read-only production governance displays only. They must not be persisted as Prisma models by default and must not mutate source records.

## Sprint 17 Evidence Import Production Safety Boundary

Sprint 17 evidence import records must preserve Sprint 10 production hardening boundaries and all Sprint 1-16 safety constraints.

Sprint 17 must not introduce production file reading, directory reading, clipboard reading, command execution, Git execution, URL fetching, external calls, MCP connections, live imports, file writes, PR creation, workers, queues, retries, replays, rollbacks, restores, resumes, Agent execution, ToolRun execution, workflow execution, deploy, publish, release, or Task completion.

EvidenceSourceProfile, EvidenceImportRecord, SanitizedEvidenceSnapshot, EvidenceRedactionPolicy, and EvidenceReviewRecord are local production evidence records only.
