# Contract: MVP Readiness State Machine

Status: proposed for Sprint 15

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

- `running`
- `executed`
- `deployed`
- `published`
- `released`
- `auto_fixed`
- `auto_remediated`
- `completed`
- `retried`
- `replayed`
- `rolled_back`
- `resumed`

## Rules

- `approved_record` is a local approval state only.
- The state machine must not contain execution, deploy, release, publish, task completion, retry, replay, rollback, or resume states.
- State transitions must not mutate source evidence records.
- State transitions must not execute AgentRun, ToolRun, workflow, file, Git, external API, MCP, PR, deploy, release, publish, or Task completion.
