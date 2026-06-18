# Contract: Department Profile State Machine

Status: proposed for Sprint 18

## Allowed States

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
archived -> terminal
```

## Forbidden States

- `active_runtime`
- `assigned`
- `executing`
- `running`
- `completed`
- `delegated`
- `escalated_runtime`
- `auto_routed`
- `invoked`
- `connected`
- `deployed`
- `released`
- `resumed`

## Rules

- `approved_record` means the local department record is approved for reference and display only.
- `approved_record` must not make a department active at runtime.
- `superseded` means a newer local record replaces this one for review purposes only.
- No state may trigger Agent, ToolRun, workflow, file, Git, PR, external API, MCP, deploy, publish, release, task completion, retry, replay, rollback, restore, or resume behavior.
