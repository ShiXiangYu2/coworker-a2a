# Contract: Workflow Orchestration State Machine

Status: proposed for Sprint 14

## Allowed States

- `proposal`
- `draft`
- `review`
- `approved_record`
- `rejected`
- `superseded`
- `archived`

## Allowed Transitions

- `proposal -> draft`
- `proposal -> archived`
- `draft -> review`
- `draft -> superseded`
- `draft -> archived`
- `review -> approved_record`
- `review -> rejected`
- `review -> superseded`
- `review -> archived`
- `approved_record -> archived`
- `rejected -> archived`
- `superseded -> archived`

## Forbidden States

- `running`
- `executed`
- `step_executed`
- `continued`
- `completed`
- `retried`
- `replayed`
- `rolled_back`
- `resumed`
- `applied`
- `called`
- `connected`
- `deployed`

## Rules

- `approved_record` is terminal for approval semantics and cannot transition into execution.
- `archived` is view-only and cannot restore, retry, replay, rollback, or resume execution.
- Any unrecognized state must be treated as invalid and denied.
