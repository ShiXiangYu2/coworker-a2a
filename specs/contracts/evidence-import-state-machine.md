# Contract: Evidence Import State Machine

Status: proposed for Sprint 17

## Purpose

The Evidence Import state machine defines safe local lifecycle states for Sprint 17 evidence records.

## Allowed States

- `draft`
- `review`
- `approved_record`
- `rejected`
- `archived`

## Allowed Transitions

- `draft -> review`
- `draft -> archived`
- `review -> approved_record`
- `review -> rejected`
- `review -> archived`
- `approved_record -> archived`
- `rejected -> archived`

## Forbidden States

- `reading`
- `directory_read`
- `clipboard_read`
- `fetched`
- `called`
- `connected`
- `executed`
- `synced`
- `imported_live`
- `external_loaded`
- `mcp_invoked`
- `agent_started`
- `tool_executed`
- `workflow_executed`
- `pr_created`
- `deployed`
- `published`
- `released`
- `completed`
- `retried`
- `replayed`
- `rolled_back`
- `restored`
- `resumed`

## Rules

- `approved_record` means the local evidence record was approved for review use only.
- `approved_record` is not an execution, release, deploy, external access, permission, or task completion token.
- No state transition may read files, run commands, fetch URLs, call external APIs, connect MCP, execute AgentRun, execute ToolRun, execute workflow, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, or resume execution.
