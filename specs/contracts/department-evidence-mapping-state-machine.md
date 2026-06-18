# Contract: Department Evidence Mapping State Machine

Status: proposed for Sprint 19

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
- `mapped_runtime`
- `routed`
- `assigned`
- `executing`
- `running`
- `completed`
- `delegated`
- `auto_routed`
- `invoked`
- `connected`
- `deployed`
- `released`
- `resumed`

## Rules

- `approved_record` means the local mapping record is approved for reference and display only.
- `approved_record` must not route, assign, execute, grant permission, import live evidence, deploy, release, or complete tasks.
- `superseded` means a newer local mapping record replaces this one for review purposes only.
- No state may trigger Agent, ToolRun, workflow, file, Git, PR, external API, MCP, live import, deploy, publish, release, task completion, retry, replay, rollback, restore, or resume behavior.
