# Contract: Agent Runtime Safety

Status: proposed for Sprint 4

## Purpose

This contract defines the safety boundary for Sprint 4 Agent Runtime.

Sprint 4 is analysis-only. It must be impossible for Agent Runtime code paths to perform external side effects.

## Forbidden Runtime Actions

The following actions are forbidden:

- execute-tool
- run-shell-command
- write-file
- edit-file
- delete-file
- create-branch
- git-add
- git-commit
- git-push
- create-pr
- merge-pr
- deploy
- publish
- release
- send-email
- send-message
- call-external-api
- write-memory
- read-private-memory
- run-a2a-autonomous-loop

## Forbidden Imports

Implementation should not import modules that enable side effects from Agent Runtime paths, including:

- `child_process`
- filesystem mutation helpers
- file write helpers
- Git execution helpers
- Tool Runtime modules
- Memory write modules
- external integration clients

Reading Harmony Task records and writing AgentRun / AgentStep / TaskStep / AuditEvent persistence is allowed.

## Human Confirmation Boundary

Human confirmation can allow:

- queueing a task
- continuing analysis-only planning
- recording an owner review decision

Human confirmation cannot allow in Sprint 4:

- tool execution
- command execution
- file edits
- Git operations
- PR creation
- deploys
- deletes
- Memory writes
- external API calls

## Result Validation Boundary

AgentResult is invalid if:

- sideEffects has any non-empty array.
- summary or findings claim that files were changed.
- proposedChanges claim completed implementation.
- next.recommendedAction asks the system to execute tools directly.
- safetyNotes are missing the analysis-only boundary.

Invalid AgentResult must be rejected before persistence. It must not create an AgentRun.completed record, TaskStep summary, or successful AuditEvent.

## UI Safety Language

Required UI copy:

```text
Sprint 4 only produces structured analysis and does not execute tools, commands, file edits, PRs, deploys, deletes, or memory writes.
```

Required button text:

```text
Run Agent Analysis
```

Forbidden button text:

```text
Execute Agent
```

## Audit Safety

AuditEvent records must describe state and analysis only.

Audit events must not trigger handlers that execute tools, shell, Git, file changes, PRs, deploys, deletes, Memory writes, A2A loops, or external APIs.

## Testing Requirements

Safety tests should verify:

- AgentResult.sideEffects is always empty.
- AgentResult with non-empty sideEffects is rejected before persistence.
- unsafe Task states cannot start AgentRun.
- pending confirmations block AgentRun.
- approval does not execute tools.
- forbidden imports are not used in Agent Runtime modules.
- Agent Runtime modules do not import `child_process`, file write helpers, Tool Runtime modules, or Memory modules.
- AgentRun.completed does not mark Task completed.
- no tests require shell, Git, file mutation, PR, deploy, delete, Memory, A2A, or external APIs.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.

## Sprint 20 Human-Gated Execution Boundary

Sprint 20 execution records may reference AgentRun and AgentResult records only as sanitized evidence or local review context.

ExecutionIntentRecord, ExecutionPlanRecord, ExecutionGateRecord, ExecutionApprovalRecord, and ExecutionReceiptRecord must not start AgentRun, continue AgentRun, route tasks to Agents, assign Agents, execute tools, execute workflows, or complete Tasks.

Kelvin approval in Sprint 20 approves only one local execution record and must not approve future Agent behavior.


## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
