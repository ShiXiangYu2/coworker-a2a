# Contract: ToolExecutor

Status: proposed for Sprint 11

## Purpose

ToolExecutor describes a deterministic local executor that can execute a narrowly allowed ToolRun.

Sprint 11 ToolExecutor is not a shell, Git, file, PR, deploy, external API, MCP, browser, database, queue, worker, or Agent execution adapter.

## Schema

```ts
ToolExecutor {
  id: string
  executorVersion: string
  toolId: string
  toolCategory: 'internal_noop' | 'read_simulated'
  executionMode: 'deterministic_local'
  enabled: boolean
  sandboxId: string
  policyId: string

  maxInputSizeChars: number
  maxOutputSizeChars: number
  timeoutMs: number
  idempotencyRequired: true

  sideEffectClass: 'none' | 'simulated_read'
  deterministicOutputRequired: true

  createdAt: string
  updatedAt: string
}
```

## Allowed Executors

Sprint 11 may define:

- `internal_noop.executor`
- `read_simulated.executor`

`read_simulated.executor` is optional.

## Execution Rules

1. Executor must be registered.
2. Executor must be enabled.
3. Executor toolCategory must be allowed by ToolExecutionPolicy.
4. Executor must reference a ToolSandbox that denies forbidden capabilities.
5. Executor must produce deterministic output for the same toolId, normalized input, policyVersion, and executorVersion.
6. Executor must not produce side effects.
7. Executor must not call AgentRuntime.

## Safety Invariants

- ToolExecutor must not import or call shell, Git, filesystem, network, external API, MCP, browser, database migration, queue, worker, deploy, retry, replay, rollback, or Agent continuation modules.
- ToolExecutor must not write files.
- ToolExecutor must not read real workspace files.
- ToolExecutor must not read environment variables or secrets.
- ToolExecutor must not create PRs, deploy, delete, or send A2A messages.
