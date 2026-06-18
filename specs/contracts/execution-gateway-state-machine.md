# Contract: Execution Gateway State Machine

Status: proposed for Sprint 20

## Statuses

```ts
type ExecutionGatewayRecordStatus =
  | 'draft'
  | 'review'
  | 'approved_record'
  | 'rejected'
  | 'superseded'
  | 'archived'
```

## Transitions

- `draft -> review`
- `draft -> archived`
- `review -> approved_record`
- `review -> rejected`
- `review -> archived`
- `approved_record -> superseded`
- `approved_record -> archived`
- `rejected -> archived`
- `superseded -> archived`

## Forbidden States

- `active_runtime`
- `executing`
- `running`
- `delegated`
- `routed`
- `auto_routed`
- `invoked`
- `connected`
- `deployed`
- `released`
- `resumed`

## Rules

- No state transition may execute runtime behavior.
- `approved_record` is a local review state only.

