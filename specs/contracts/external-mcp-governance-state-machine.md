# Contract: External / MCP Governance State Machine

Status: proposed for Sprint 13

## Purpose

Defines valid lifecycle states for Sprint 13 External Integration / MCP governance records.

This state machine is record-only. It must not call external APIs, connect MCP, send messages, dispatch webhooks, execute ToolRuns, start Agents, or complete Tasks.

## States

Allowed states:

- `proposal`
- `draft`
- `review`
- `approved_record`
- `rejected`
- `superseded`
- `archived`

Forbidden states:

- `connected`
- `called`
- `sent`
- `synced`
- `webhook_created`
- `mcp_invoked`
- `external_updated`
- `executed`
- `running`
- `dispatched`
- `queued`
- `retried`
- `replayed`
- `rolled_back`
- `resumed`

## Allowed Transitions

- `proposal -> draft`
- `proposal -> review`
- `draft -> review`
- `review -> approved_record`
- `review -> rejected`
- `proposal -> superseded`
- `draft -> superseded`
- `review -> superseded`
- `approved_record -> archived`
- `rejected -> archived`
- `superseded -> archived`

## Terminal Rules

- `approved_record`, `rejected`, `superseded`, and `archived` are terminal for execution purposes.
- `approved_record` means a local governance record was approved for human-readable planning only.
- No terminal state can be consumed as an execution token.

## Safety Invariants

- No state transition can create an external connection.
- No state transition can send a network request.
- No state transition can create a webhook, worker, queue, or background job.
- No state transition can execute a ToolRun or AgentRun.
- No state transition can complete a Task.
