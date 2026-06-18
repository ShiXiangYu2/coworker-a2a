# Plan: Sprint 6 - Tool Integration / Permission / Command Policy

Status: proposed

## Architecture Decision

Sprint 6 adds a tool proposal and permission layer:

```text
AgentResult
  -> AgentResult-to-ToolCall mapper
  -> ToolCall proposal
  -> ToolRegistry validation
  -> CommandPolicy / PermissionProfile evaluation
  -> ConfirmationArtifact when required
  -> AuditEvent
  -> ChatHub / Task UI
```

It stops before:

```text
Tool execution
shell / Git / file mutation
PR / deploy / delete
external API / MCP / browser automation
background worker execution
```

## Database Recommendation

Add narrow tables during implementation:

- `ToolCall`
- `ToolPermission`
- `ToolRun`

ToolDefinition, ToolRegistry, CommandPolicy, and PermissionProfile may start as code configuration or JSON specs. Database tables for those are not required in the first implementation unless the team wants admin-editable policies later.

Do not add:

- `ToolExecutionWorker`
- `CommandRun`
- `ShellSession`
- `GitOperation`
- `FilePatch`
- `PullRequestRun`
- `DeployRun`
- `ExternalApiCall`
- `McpSession`
- `BrowserSession`
- `QueueJob`

## Module Design

| Module | Responsibility |
| --- | --- |
| Tool contracts | Defines ToolDefinition, ToolRegistry, ToolCall, ToolRun, ToolResult, and ToolPermission. |
| Command policy | Applies default-deny PermissionProfile rules. |
| Tool proposal mapper | Converts safe AgentResult content into ToolCall proposals. |
| Permission evaluator | Validates registration, enabled status, risk, category, and profile rules. |
| Confirmation boundary | Creates or links ConfirmationArtifact for high-risk proposals. |
| Audit writer | Records tool proposal and permission lifecycle events. |
| API | Local proposal, evaluation, confirmation, and query endpoints only. |
| UI | Tool proposal cards, policy decision cards, Kelvin review cards, and safety note. |
| Tests | State machine, permission, mapping, safety, and regression coverage. |

## API Plan

All POST APIs should accept optional `idempotencyKey` for creating or transitioning local records.

All mutation APIs should return related `auditEvents`.

`POST /api/tool-calls/:id/evaluate-permission` must be idempotent for the same ToolCall, ToolDefinition version, CommandPolicy version, and normalized input.

`GET /api/tool-calls/:id` should include the latest ToolPermission. If that becomes too large for the first implementation, add:

```text
GET /api/tool-calls/:id/permission
```

Tool registry:

```text
GET /api/tools
GET /api/tools/:id
GET /api/command-policy
```

Tool calls:

```text
POST /api/tool-calls/from-agent-result
GET  /api/tool-calls
GET  /api/tool-calls/:id
POST /api/tool-calls/:id/evaluate-permission
POST /api/tool-calls/:id/cancel
GET  /api/tool-calls/:id/permission
GET  /api/harmony/tasks/:id/tool-calls
GET  /api/agent-runtime/runs/:id/tool-calls
```

Tool runs:

```text
GET /api/tool-runs/:id
```

Human confirmation:

```text
POST /api/tool-confirmations/:id/approve
POST /api/tool-confirmations/:id/reject
```

Do not add:

```text
POST /api/tools/execute
POST /api/tool-runs/:id/start
POST /api/commands/run
POST /api/files/write
POST /api/git/push
POST /api/deploy
POST /api/tools/run
POST /api/tools/dispatch
POST /api/tool-runs/:id/execute
POST /api/tool-runs/:id/run
POST /api/tool-runs/:id/dispatch
```

No API route path may contain `execute`, `run`, `dispatch`, or `start` for tool execution semantics in Sprint 6.

## ChatHub / Task UI Plan

AgentResult card adds:

- `Propose Tool Call`
- `View Tool Proposals`

Task card adds:

- linked ToolCall proposal list
- permission decision summary
- confirmation status
- required Sprint 6 safety note

Kelvin confirmation card supports reviewing intent, input summary, risk level, policy decision, and forbidden runtime actions.

UI must not display:

- `Execute Tool`
- `Run Command`
- `Apply File Edit`
- `Create PR`
- `Deploy`
- `Dispatch`
- `Send External Request`
- `Start Tool Runtime`

## Delivery Order

1. Add Sprint 6 specs and contracts.
2. Review specs before implementation.
3. Add ToolCall, ToolPermission, and ToolRun data models.
4. Add code-configured ToolRegistry and CommandPolicy.
5. Add pure ToolCall and ToolRun state machines.
6. Add AgentResult -> ToolCall proposal mapper.
7. Add permission evaluator.
8. Add API routes.
9. Add ChatHub / Task UI.
10. Add tests and acceptance report.

## Acceptance Gate

Sprint 6 can be marked complete only when:

- ToolCall proposal flow is local, auditable, and idempotent.
- CommandPolicy default is deny.
- Approval does not execute tools.
- No real shell, Git, file write, PR, deploy, delete, database mutation, external API, MCP, browser automation, or background execution path exists.
- ToolCall and ToolRun state machines do not include `running`, `executed`, or `side_effect_completed`.
- ToolResult.sideEffects must be empty.
- forbidden imports and forbidden side-effect paths are covered by tests.
- approval does not create executable ToolRun records.
- read tools do not read files, network resources, MCP, browser, or external APIs in Sprint 6.
- no API route path contains `execute`, `run`, `dispatch`, or `start` for tool execution semantics.
- Sprint 1, Sprint 2, Sprint 3, Sprint 4, and Sprint 5 regression tests pass.
