# Contract: AgentTeam

Status: proposed for Sprint 9

## Purpose

AgentTeam defines a local collaboration team configuration for Sprint 9.

It is not a runtime worker pool and does not start Agents.

## Schema

```ts
AgentTeam {
  id: string
  name: string
  purpose: string
  status: 'active' | 'archived'

  leadAgentId: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'
  memberAgentIds: ('elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin')[]

  collaborationMode:
    | 'ceo_led'
    | 'product_engineering_review'
    | 'verification_review'
    | 'customer_feedback_review'

  riskTier: 'low' | 'medium' | 'high'
  defaultRequiresHumanConfirmation: boolean

  createdBy: 'system' | 'human'
  createdAt: string
  updatedAt: string
}
```

## Recommended Sprint 9 Teams

- `default_company_team`: Elon, Jobs, Linus, Turing, Bezos.
- `product_engineering_review`: Jobs, Linus, Turing.
- `customer_feedback_review`: Bezos, Jobs, Turing.

## Persistence Guidance

Sprint 9 may keep AgentTeam as static code configuration.

Use a database table only if Sprint 9 needs editable team records or team history.

## Safety Invariants

- AgentTeam is metadata only.
- AgentTeam membership must not imply AgentRun startup.
- AgentTeam must not contain Tool Runtime, queue, worker, external endpoint, or process execution configuration.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.

