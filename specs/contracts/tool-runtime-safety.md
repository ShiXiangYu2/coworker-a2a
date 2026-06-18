# Contract: Tool Runtime Safety

Status: proposed for Sprint 6

## Purpose

This contract defines the safety boundary for Sprint 6 Tool Integration.

Sprint 6 introduces tool proposals and permission records. It must not become a real Tool Runtime.

## Hard Prohibitions

Sprint 6 must not:

- execute shell commands
- execute Git operations
- modify, create, patch, format, or delete files
- create, merge, push, or edit pull requests
- deploy, publish, or release
- run database migrations
- mutate production data
- call external APIs
- invoke MCP tools
- automate browsers
- send emails, chat messages, webhooks, or network A2A messages
- enqueue external jobs
- run background workers
- start target Agents from tool approval
- continue AgentRun automatically after tool approval
- mark Task completed from tool approval

## Safe Local Actions

Sprint 6 may:

- register local ToolDefinition metadata
- list ToolRegistry entries
- create ToolCall proposals
- evaluate ToolPermission records
- create ConfirmationArtifact records
- approve or reject local ToolCall records
- create non-execution ToolRun placeholders
- create mock-only ToolResult records with empty sideEffects
- write AuditEvent records
- render ChatHub / Task UI cards

## Approval Boundary

Human approval in Sprint 6 means local status progression only.

Approval does not authorize:

- Tool Runtime execution
- shell commands
- Git operations
- file writes
- PRs
- deploys
- deletes
- database migrations
- external API calls
- MCP calls
- browser automation
- Agent continuation
- Task completion

## Kelvin Boundary

Kelvin review is required for:

- command, Git, file write, PR, deploy, database, external API, MCP, and browser categories
- `riskLevel = high` or `riskLevel = critical`
- `isDestructive = true`
- `isOpenWorld = true`
- non-empty sideEffects
- permission, secret, production, deploy, migration, deletion, or external communication topics
- low-confidence policy decisions

Kelvin approval still does not execute anything.

## Forbidden Imports / Paths

Sprint 6 implementation should not import or call:

- `child_process`
- filesystem write helpers for product behavior
- Git command wrappers
- external API clients
- MCP clients
- browser automation clients
- deploy clients
- database migration runners
- queue workers
- background job runners

Tests should verify that Sprint 6 modules do not introduce forbidden side-effect paths.

## Required Safety Acceptance Tests

Sprint 6 acceptance must include tests or static checks proving:

- ToolCall approval does not start ToolRun execution.
- ToolCall approval does not start AgentRun.
- ToolCall approval does not change Task status to completed.
- CommandPolicy default is deny.
- Unknown tools are blocked.
- Disabled tools are blocked.
- ToolResult.sideEffects non-empty records are rejected.
- UI does not show `Execute Tool`, `Run Command`, `Apply File Edit`, `Create PR`, `Deploy`, `Dispatch`, `Send External Request`, or `Start Tool Runtime`.
- Sprint 6 modules do not import forbidden side-effect paths.

## UI Safety Copy

Required copy:

```text
Sprint 6 records tool proposals, permission decisions, and approvals only. It does not execute tools, shell commands, Git operations, file edits, PRs, deploys, deletes, database changes, external APIs, MCP calls, or browser automation.
```

## Sprint 7 Eval Boundary

Sprint 7 may evaluate ToolDefinition, ToolCall, ToolPermission, ToolRun placeholder, and ToolResult records.

Eval is recommendation-only and must not become a tool execution path.

Sprint 7 Eval must not:

- execute tools
- create executable ToolRun records
- approve ToolCalls automatically
- convert ToolPermission decisions into execution permission
- call shell, Git, file, PR, deploy, delete, database, external API, MCP, browser, queue, or worker paths
- continue AgentRun after a gate recommendation
- mark Task completed

QualityGateDecision can recommend that future execution should be blocked, but Sprint 7 must not enforce that recommendation by mutating ToolCall or Task status automatically.

## Sprint 8 Observability Boundary

Sprint 8 may observe Tool records but must not become a replay or resume path for tools.

Sprint 8 must not:

- execute tools from RecoveryPoint or ResumeToken.
- create executable ToolRun records.
- re-evaluate permissions automatically from resume views.
- mutate ToolCall status from audit, timeline, recovery, or failure views.
- call shell, Git, file, PR, deploy, delete, database, external API, MCP, browser, queue, or worker paths.

Sprint 8 may display ToolCall timeline, ToolPermission history, mock-only ToolRun records, RecoveryPoint snapshots, and FailureClassification records only.

## Sprint 9 Collaboration Boundary

Sprint 9 collaboration records may reference ToolCall proposals or future tool recommendations as local context only.

Sprint 9 must not:

- execute Tool Runtime from CollaborationDecision.
- create executable ToolRun from HandoffRequest.
- approve ToolCall automatically from A2ATurn.
- start AgentRun after tool-related collaboration approval.
- call shell, Git, file, PR, deploy, delete, database, external API, MCP, browser, queue, or worker paths.

## Sprint 10 Production Hardening Boundary

Sprint 10 may inspect Tool Runtime safety boundaries through SecurityPolicy, AgentPermissionBoundary, ReleaseReadinessChecklist, and RegressionGate.

Sprint 10 must not:

- introduce real Tool Runtime.
- create executable ToolRun.
- convert ToolCall proposal into execution.
- add ToolExecutor, ToolExecutionWorker, CommandRun, ShellSession, GitOperation, FilePatch, PullRequestRun, DeployRun, ExternalApiCall, McpSession, BrowserSession, QueueJob, or AutoFixRun.
- call shell, Git, file write, PR, deploy, delete, database, external API, MCP, browser, queue, worker, or auto-fix paths.

Sprint 10 release readiness approval does not authorize Sprint 11 Tool Runtime execution. Sprint 11 must introduce its own explicit execution specs, permission model, sandbox model, and human confirmation boundary.

## Sprint 11 Controlled Real Tool Runtime Boundary

Future boundary only, not implemented in Sprint 10.

Sprint 11 introduces the first real Tool Runtime only for:

- deterministic local `internal_noop`
- deterministic local `read_simulated` if explicitly enabled

Sprint 11 still must not:

- execute shell commands.
- execute Git operations.
- read real workspace files.
- modify, create, patch, format, or delete files.
- create, merge, push, or edit PRs.
- deploy, publish, or release.
- run database migrations.
- mutate production data.
- call external APIs.
- invoke MCP tools.
- automate browsers.
- send emails, chat messages, webhooks, or network A2A messages.
- enqueue external jobs.
- run background workers.
- retry, replay, rollback, or resume execution.
- start or continue AgentRun.
- mark Task completed.
- approve future ToolRuns automatically.

Sprint 11 execution requires:

- ToolExecutionPolicy.
- ToolSandbox.
- ToolPermission.
- ToolExecutionPlan.
- RecoveryPoint before execution.
- Kelvin confirmation when required.
- explicit user action through `execute-approved`.
- ToolExecutionReceipt.
- AuditEvent and ObservabilityEvent.

`execute-approved` is the only allowed Sprint 11 execution-semantics API and must be constrained to approved deterministic local no-op / read_simulated ToolRuns.

## Sprint 12 File / Git / PR Proposal Boundary

Future boundary only, not implemented in Sprint 10.

Sprint 12 may reference Sprint 11 ToolResult and ToolExecutionReceipt records as evidence for FileChangeProposal creation.

Sprint 12 must not expand Tool Runtime to:

- read real workspace files.
- write, patch, format, rename, or delete files.
- run shell.
- run Git.
- commit, push, merge, checkout, or rebase.
- create PRs.
- deploy.
- call external APIs.
- invoke MCP.
- automate browsers.

`execute-approved` remains limited to approved deterministic local `internal_noop` / `read_simulated` ToolRuns. It must not execute FileChangeProposal, PatchDraft, GitChangePlan, PullRequestPlan, or ReviewPatchRecord.

File / Git / PR proposal approval must not call Tool Runtime.

## Sprint 13 External / MCP Governance Boundary

Future boundary only, not implemented in Sprint 10.

Sprint 13 may reference Sprint 11 ToolResult and ToolExecutionReceipt records as evidence for ExternalActionProposal creation.

Sprint 13 must not expand Tool Runtime to:

- call external APIs.
- connect MCP.
- send network requests.
- create webhooks.
- create workers, queues, or background jobs.
- send email, chat, messages, webhooks, or notifications.
- read external system data.
- fetch external system schemas.
- write external systems.
- invoke MCP tools.
- retry, replay, rollback, or resume execution.
- start or continue AgentRun.
- mark Task completed.

`execute-approved` remains limited to approved deterministic local `internal_noop` / `read_simulated` ToolRuns. It must not execute ExternalIntegrationProfile, McpConnectionProfile, ExternalActionProposal, ExternalActionReviewRecord, IntegrationRiskAssessment, or IntegrationAuditPolicy.

External / MCP governance approval must not call Tool Runtime.
## Sprint 14 Workflow Orchestration Boundary

Sprint 14 may reference Sprint 11 ToolRun, ToolResult, ToolExecutionPlan, and ToolExecutionReceipt records as sanitized evidence for WorkflowProposal and WorkflowStepRecord creation.

Sprint 14 must not expand Tool Runtime to execute workflow steps, continue Agents, execute additional ToolRuns, or auto-approve future ToolRuns.

## Sprint 15 MVP Closure Boundary

Sprint 15 may reference Sprint 11 ToolRun, ToolResult, ToolExecutionPlan, and ToolExecutionReceipt records as sanitized MVP readiness evidence only.

Sprint 15 must not expand Tool Runtime to execute AgentRun, execute ToolRun, execute workflow, write files, run Git, call external APIs, connect MCP, create PRs, deploy, publish, release, complete Task, retry, replay, rollback, restore, or resume execution.

## Sprint 16 MVP Demo Polish Boundary

Sprint 16 may display Sprint 11 Tool Runtime records in MVPRecordChainView and MVPOperatorConsole as sanitized evidence only.

Sprint 16 must not expand Tool Runtime to execute ToolRuns, request Tool permission, approve Tool execution, call `execute-approved`, continue Agents, complete Tasks, retry, replay, rollback, restore, or resume execution.

`execute-approved` remains limited to approved deterministic local `internal_noop` / `read_simulated` ToolRuns and must not be exposed or triggered by Sprint 16 operator console views.

## Sprint 17 Evidence Import Boundary

Sprint 17 may reference Sprint 11 Tool Runtime records as user-provided or local sanitized evidence only.

Sprint 17 must not expand Tool Runtime to execute ToolRuns, request Tool permission, approve Tool execution, call `execute-approved`, continue Agents, complete Tasks, retry, replay, rollback, restore, or resume execution.

ToolResult and ToolExecutionReceipt may be evidence only and must not become EvidenceImportRecord execution tokens.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.

## Sprint 20 Human-Gated Execution Boundary

Sprint 20 execution records may reference ToolCall, ToolRun, ToolExecutionPlan, ToolExecutionReceipt, and ToolResult records only as sanitized evidence or local review context.

Execution records must not request Tool permission, approve runtime permission, call execute-approved, execute ToolRun, run shell, run Git, read real files, write files, call external APIs, connect MCP, create PRs, deploy, release, complete Tasks, retry, replay, rollback, restore, or resume execution.

Kelvin approval in Sprint 20 approves only one local execution record and must not approve future ToolRun behavior.

