# Contract: AgentProfile

Status: proposed for Sprint 10

## Purpose

AgentProfile defines the production-facing identity, responsibility, allowed local record actions, forbidden actions, skill references, and human confirmation requirements for each Agent in the Agent company model.

Sprint 10 AgentProfile is a governance record. It does not start or execute an Agent.

## Agent IDs

```ts
AgentId =
  | 'kelvin'
  | 'claude_ceo'
  | 'elon'
  | 'jobs'
  | 'linus'
  | 'turing'
  | 'bezos'
```

`claude_ceo` is the recommended implementation identity for the CEO Agent when Claude is used as the underlying model.

`elon` may remain as a product persona or legacy CEO label, but Sprint 10 specs should treat `claude_ceo` as the model-backed CEO boundary.

Sprint 10 must not treat `claude_ceo` and `elon` as two parallel CEO execution identities.

If existing AgentRuntime, AgentProfile, RouteDecision, Task, or Collaboration records still use `elon`, the implementation must use an explicit mapping:

```ts
{
  agentId: 'elon'
  modelIdentity: 'claude_ceo'
  personaAlias: 'elon'
}
```

This means `elon` is the CEO persona / product alias and `claude_ceo` is the model-backed identity. It does not create a second CEO Agent.

## Schema

```ts
AgentProfile {
  id: AgentId
  displayName: string
  role:
    | 'human_owner'
    | 'ceo_agent'
    | 'product_agent'
    | 'engineering_agent'
    | 'verification_agent'
    | 'customer_agent'

  responsibility: string[]
  allowedActions: string[]
  forbiddenActions: string[]
  allowedOutputTypes: string[]
  forbiddenOutputTypes: string[]
  skillRefs: string[]

  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requiresHumanConfirmation: boolean
  permissionBoundaryId: string

  modelIdentity?: 'claude_ceo'
  personaAlias?: 'elon'

  systemPromptRef?: string
  status: 'draft' | 'active' | 'disabled'

  createdAt: string
  updatedAt: string
}
```

## Required Profiles

### Kelvin / Chairman

- Role: `human_owner`.
- Responsibility: final human authority, approve or reject high-risk local records, resolve ambiguity.
- Allowed actions: inspect, review, approve local records, reject local records, activate security policy records.
- Forbidden actions in Sprint 10 UI: direct execution, bypass policy, deploy, delete.
- Risk level: `critical`.
- Requires human confirmation: true for high-risk decisions.

### Claude CEO

- Role: `ceo_agent`.
- Responsibility: understand goals, plan, route, coordinate, decompose, identify risks, request review.
- Allowed actions: propose RouteDecision, TaskDecomposition, CollaborationPlan, RiskAssessment, ToolCall proposal, Eval request local records.
- Forbidden actions: execute tools, start AgentRuns, run shell, use Git, write files, create PRs, deploy, delete, call external APIs, call MCP, dispatch A2A, approve records, complete Tasks, bypass Kelvin.
- Allowed output types: structured local records only.
- Risk level: `high`.
- Requires human confirmation: true for high-risk proposals.

### Jobs / Product Agent

- Role: `product_agent`.
- Responsibility: PRD critique, user value, UX, scope, acceptance criteria.
- Forbidden actions: execution, file mutation, Tool Runtime, external calls, approval of high-risk records.
- Risk level: `medium`.

### Linus / Engineering Agent

- Role: `engineering_agent`.
- Responsibility: engineering design, implementation plan, architecture review, code review recommendations.
- Forbidden actions: direct file write, shell, Git, PR, deploy, Tool Runtime execution.
- Risk level: `high`.

### Turing / Verification Agent

- Role: `verification_agent`.
- Responsibility: eval, checklist, verification, quality gate recommendation.
- Forbidden actions: auto-fix, target mutation, ToolCall creation, task blocking, task completion, execution.
- Risk level: `medium`.

### Bezos / Customer Agent

- Role: `customer_agent`.
- Responsibility: customer value, adoption, support, business outcome critique.
- Forbidden actions: execution, external messaging, A2A dispatch, approval of high-risk records.
- Risk level: `medium`.

## Safety Invariants

- AgentProfile is not an execution handle.
- `status = active` means the profile may be referenced by local records, not that the Agent is running.
- No AgentProfile may grant shell, Git, file write, PR, deploy, delete, external API, MCP, or unrestricted Tool execution in Sprint 10.
- AgentProfile must reference an AgentPermissionBoundary.
- `claude_ceo` and `elon` must not both be active CEO execution identities.
- Any `elon` CEO profile must explicitly map to `modelIdentity = 'claude_ceo'` or declare `personaAlias = 'elon'`.
- The identity mapping is for attribution, prompts, and UI clarity only. It does not start a CEO execution path.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.

