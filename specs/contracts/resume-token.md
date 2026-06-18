# Contract: ResumeToken

Status: proposed for Sprint 8

## Purpose

ResumeToken allows users to reopen a specific view of ChatHub, Task, Audit, RunJournal, RecoveryPoint, or Failure state.

Sprint 8 ResumeToken is view-only. It is not an execution token.

## Schema

```ts
ResumeToken {
  id: string
  schemaVersion: string
  correlationId: string

  targetType:
    | 'chat_thread'
    | 'task'
    | 'agent_run'
    | 'tool_call'
    | 'eval_run'
    | 'audit_timeline'
    | 'recovery_point'
    | 'failure'

  targetId: string
  recoveryPointId?: string

  mode: 'view_only'
  allowedActions: ('view_timeline' | 'view_snapshot' | 'view_audit' | 'view_journal' | 'copy_context')[]
  forbiddenActions: (
    | 'start_agent'
    | 'run_tool'
    | 'dispatch_a2a'
    | 'write_memory'
    | 'approve_record'
    | 'change_task_status'
    | 'call_external_api'
    | 'run_eval'
    | 'replay'
    | 'retry'
    | 'restore_state'
  )[]

  maxUses?: number
  useCount: number
  revokedAt?: string
  revokedReason?: string
  expiresAt?: string
  createdBy: 'system' | 'user' | 'kelvin'
  createdAt: string
  usedAt?: string
}
```

## Use Rules

Using a ResumeToken may:

- open a ChatHub thread view.
- open a Task detail view.
- open an audit timeline.
- open a RecoveryPoint snapshot.
- open a RunJournal view.
- open a FailureClassification view.
- copy sanitized context for manual use.

Using a ResumeToken must not:

- start AgentRun.
- create or execute ToolCall / ToolRun.
- approve ToolPermission or ToolCall.
- write MemoryEntry or KnowledgeItem.
- send, dispatch, queue, or approve A2AMessage.
- start EvalRun.
- mutate Task status.
- call external APIs.
- execute shell, Git, file write, PR, deploy, delete, MCP, browser automation, worker, or queue behavior.

## API Use Rule

`POST /api/resume-tokens/:id/use` may only open a view context. It must not continue, retry, replay, restore, start, dispatch, approve, or execute any flow.

If `maxUses` is set, using the token when `useCount >= maxUses` must fail closed.

If `revokedAt` is set, using the token must fail closed and may return `revokedReason`.

## Required Events

- `resume.token_created`
- `resume.token_used`
- `resume.view_restored`
- `resume.execution_blocked` when a request includes execution semantics

## Safety Invariants

- `mode` must be `view_only` in Sprint 8.
- ResumeToken must not be accepted by Agent Runtime, Tool Runtime, Memory write, A2A dispatch, or Eval run creation APIs as execution authorization.
- Expired tokens must not restore views.
- Revoked tokens must not restore views.
- Exhausted tokens must not restore views.
