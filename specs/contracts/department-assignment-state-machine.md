# Contract: Department Assignment State Machine

Status: proposed for Sprint 21

## Allowed Statuses

- `draft`
- `review`
- `approved_record`
- `rejected`
- `superseded`
- `archived`

## Allowed Transitions

```text
draft -> review
draft -> archived
review -> approved_record
review -> rejected
review -> archived
approved_record -> superseded
approved_record -> archived
rejected -> archived
superseded -> archived
```

## Forbidden States

Sprint 21 records must never use:

- `assigned_runtime`
- `active_runtime`
- `routed`
- `auto_routed`
- `executing`
- `running`
- `delegated`
- `invoked`
- `connected`
- `deployed`
- `released`
- `completed`
- `resumed`

## Lifecycle Semantics

- `approved_record` means the local assignment-related record was reviewed.
- It does not mean Task was routed.
- It does not mean Agent was assigned at runtime.
- It does not mean AgentRun started.
- It does not mean ToolRun, workflow, external API, MCP, file, Git, PR, deploy, release, retry, replay, rollback, restore, or resume happened.
- It does not mean Task completed.

## Supersede Semantics

Superseded records must include:

- `supersededByRecordId?: string`
- `supersededAt?: string`
- `supersedeReason?: string`

Supersede is descriptive local record lifecycle only. It must not roll back, restore, retry, replay, resume, or mutate source records.
