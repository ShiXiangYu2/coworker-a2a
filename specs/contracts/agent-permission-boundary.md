# Contract: AgentPermissionBoundary

Status: proposed for Sprint 10

## Purpose

AgentPermissionBoundary defines what an Agent may and may not do across planning, routing, local record creation, approvals, and future execution surfaces.

In Sprint 10 every AgentPermissionBoundary is non-executing.

## Schema

```ts
AgentPermissionBoundary {
  id: string
  boundaryVersion: string
  agentId: 'kelvin' | 'claude_ceo' | 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos'

  allowedActions: string[]
  forbiddenActions: string[]
  allowedOutputTypes: string[]
  forbiddenOutputTypes: string[]

  mayCreateLocalRecord: boolean
  mayCreateToolCallProposal: boolean
  mayRequestEval: boolean
  mayRequestKelvinReview: boolean
  mayApproveLocalRecord: boolean

  mayMutateTaskStatus: false
  mayStartAgentRun: false
  mayExecuteTool: false
  mayCreateExecutableToolRun: false
  mayCallExternalApi: false
  mayCallMcp: false
  mayWriteFile: false
  mayUseShell: false
  mayUseGit: false
  mayCreatePr: false
  mayDeploy: false
  mayDelete: false
  mayDispatchA2A: false
  mayResumeExecution: false
  mayBypassPermission: false

  requiresHumanConfirmation: boolean
  requiresEvalForHighRisk: boolean
  riskLevel: 'low' | 'medium' | 'high' | 'critical'

  securityPolicyId: string
  commandPolicyId?: string
  createdAt: string
  updatedAt: string
}
```

## Claude CEO Boundary

```ts
AgentPermissionBoundary {
  agentId: 'claude_ceo'
  mayCreateLocalRecord: true
  mayCreateToolCallProposal: true
  mayRequestEval: true
  mayRequestKelvinReview: true
  mayApproveLocalRecord: false
  mayMutateTaskStatus: false
  mayStartAgentRun: false
  mayExecuteTool: false
  mayCreateExecutableToolRun: false
  mayCallExternalApi: false
  mayCallMcp: false
  mayWriteFile: false
  mayUseShell: false
  mayUseGit: false
  mayCreatePr: false
  mayDeploy: false
  mayDelete: false
  mayDispatchA2A: false
  mayResumeExecution: false
  mayBypassPermission: false
}
```

## Rules

1. Missing boundary means deny.
2. Any missing boolean execution capability is treated as false.
3. Any conflict between AgentPermissionBoundary and SecurityPolicy resolves to deny.
4. Any conflict between AgentPermissionBoundary and CommandPolicy resolves to deny.
5. AgentPermissionBoundary evaluation must not mutate target records.
6. AgentPermissionBoundary cannot approve records automatically.
7. Kelvin approval cannot expand an AgentPermissionBoundary in Sprint 10.

## Safety Invariants

- AgentPermissionBoundary is always stricter than or equal to SecurityPolicy.
- No AgentPermissionBoundary can allow execution in Sprint 10.
- `mayApproveLocalRecord` never implies ability to execute approved content.
- Agent-generated records must remain local records until a later Sprint explicitly introduces execution semantics.

## Sprint 11 Controlled Tool Runtime Boundary

Future boundary only, not implemented in Sprint 10.

Sprint 11 does not grant Agents execution authority.

AgentPermissionBoundary remains:

```ts
mayExecuteTool: false
mayCreateExecutableToolRun: false
mayStartAgentRun: false
mayMutateTaskStatus: false
```

Agents may propose ToolCall records only if already allowed.

Only explicit user action can call `execute-approved`, and only after ToolExecutionPolicy, ToolSandbox, ToolPermission, ToolExecutionPlan, RecoveryPoint, and Kelvin confirmation when required.

Claude CEO, Jobs, Linus, Turing, and Bezos must not execute tools, approve ToolRuns, continue Agents, or complete Tasks in Sprint 11.

## Sprint 12 File / Git / PR Proposal Boundary

Future boundary only, not implemented in Sprint 10.

Sprint 12 does not grant Agents file, Git, PR, deploy, or delete authority.

AgentPermissionBoundary remains:

```ts
mayWriteFile: false
mayUseShell: false
mayUseGit: false
mayCreatePr: false
mayDeploy: false
mayDelete: false
mayExecuteTool: false
mayStartAgentRun: false
mayMutateTaskStatus: false
```

Agents may propose local FileChangeProposal records only if allowed by their profile and only through explicit user action or reviewed local record flow.

Claude CEO, Jobs, Linus, Turing, and Bezos must not apply patches, write files, run Git, create PRs, deploy, delete, or complete Tasks in Sprint 12.

## Sprint 13 External / MCP Governance Boundary

Future boundary only, not implemented in Sprint 10.

Sprint 13 does not grant Agents external integration, MCP, webhook, worker, queue, message sending, or external system authority.

AgentPermissionBoundary remains:

```ts
mayCallExternalApi: false
mayCallMcp: false
mayExecuteTool: false
mayStartAgentRun: false
mayMutateTaskStatus: false
```

Agents may propose local ExternalActionProposal records only if allowed by their profile and only through explicit user action or reviewed local record flow.

Claude CEO, Jobs, Linus, Turing, and Bezos must not call external APIs, connect MCP, create webhooks, create workers or queues, send messages, read or write external systems, execute ToolRuns, start Agents, or complete Tasks in Sprint 13.
## Sprint 14 Workflow Orchestration Boundary

Sprint 14 does not grant Agents workflow execution, workflow step execution, Agent continuation, ToolRun execution, file, Git, external API, MCP, PR, deploy, Task completion, retry, replay, rollback, or resume authority.

Agents may propose local WorkflowProposal drafts as records only when allowed by product flow. They must not execute or continue workflow steps.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.


## Sprint 21 Department Assignment Boundary

Sprint 21 DepartmentTaskIntakeRecord, DepartmentAssignmentProposal, DepartmentRoleFitReview, DepartmentAssignmentApprovalRecord, and DepartmentAssignmentAuditRecord may reference this contract only as sanitized evidence or local review context.

Sprint 21 assignment records must not be consumed as execution tokens, routing tokens, runtime assignment tokens, runtime permission grants, release tokens, deploy tokens, Task completion tokens, retry/replay/rollback/restore tokens, resume execution tokens, or future approval tokens.

Kelvin approval in Sprint 21 approves only one local assignment record. It must not execute Agent, continue Agent, auto-route Task, assign Agent at runtime, start AgentRun, execute ToolRun, request or approve runtime permission, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, resume execution, or approve future assignment behavior.
