# Contract: SkillIOContract

Status: proposed for Sprint 10

## Purpose

SkillIOContract defines structured input, structured output, allowed side effects, audit fields, redaction requirements, and eval requirements for reusable Agent skills.

Sprint 10 only defines contracts. It does not implement a Skill Runtime.

## Schema

```ts
SkillIOContract {
  id: string
  contractVersion: string
  skillRef: string
  displayName: string
  description: string

  skillCategory:
    | 'planning'
    | 'product'
    | 'engineering'
    | 'verification'
    | 'customer'
    | 'memory'
    | 'tooling'
    | 'safety'
    | 'observability'

  ownerAgentIds: string[]
  inputSchema: Json
  outputSchema: Json

  allowedSideEffects: 'none'
  forbiddenSideEffects: string[]

  outputMustBeStructured: true
  auditFieldsRequired: string[]
  correlationRequired: true
  redactionRequired: true
  evalRequired: boolean
  humanConfirmationRequired: boolean

  forbiddenOutputs: string[]
  maxInputSizeChars: number
  maxOutputSizeChars: number

  createdAt: string
  updatedAt: string
}
```

## Recommended Skill Categories

- `planning`: CEO goal shaping, routing, decomposition.
- `product`: PRD, user value, UX critique.
- `engineering`: design proposal, implementation planning, review recommendation.
- `verification`: eval, checklist, quality gate recommendation.
- `customer`: adoption, support, business impact critique.
- `memory`: memory candidate review and knowledge hygiene proposals.
- `tooling`: ToolCall proposal and permission reasoning only. It does not mean Tool Runtime, ToolDefinition, ToolExecutor, shell, Git, file, PR, deploy, external API, or MCP execution.
- `safety`: risk review, policy review, redaction review.
- `observability`: audit and release readiness inspection.

## Rules

1. `allowedSideEffects` must be `none` in Sprint 10.
2. Skill output must be structured.
3. Skill output must not directly mutate Task, AgentRun, ToolCall, Memory, Eval, A2A, or Collaboration states.
4. Skill output must not contain secrets or blocked payloads.
5. Skill output must not include executable shell, Git, deploy, external API, or MCP instructions as actionable commands.
6. Skills may propose local records only when allowed by AgentPermissionBoundary.
7. Tooling skills may propose ToolCall records but must not execute them.
8. SkillIOContract must not be used as ToolDefinition.
9. SkillIOContract must not be used as ToolExecutor.

## Safety Invariants

- SkillIOContract is not a runtime.
- Skill references must not be treated as tool identifiers.
- No SkillIOContract may allow file writes, Git operations, shell commands, PR creation, deploys, deletes, external API calls, MCP calls, A2A dispatch, or autonomous loops in Sprint 10.
- `skillCategory = 'tooling'` means proposal and policy reasoning only.
