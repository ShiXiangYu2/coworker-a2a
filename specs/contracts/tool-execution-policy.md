# Contract: ToolExecutionPolicy

Status: proposed for Sprint 11

## Purpose

ToolExecutionPolicy is the Sprint 11 default-deny execution policy for the first controlled real Tool Runtime.

It is stricter than general CommandPolicy and applies only to ToolRun execution.

## Schema

```ts
ToolExecutionPolicy {
  id: string
  policyVersion: string
  status: 'draft' | 'active' | 'archived'
  defaultDecision: 'deny'

  allowedToolCategories: ('internal_noop' | 'read_simulated')[]
  deniedToolCategories: (
    | 'read'
    | 'write'
    | 'command'
    | 'git'
    | 'file_read'
    | 'file_write'
    | 'pr'
    | 'deploy'
    | 'database'
    | 'database_migration'
    | 'external_api'
    | 'mcp'
    | 'browser'
  )[]

  requiresKelvinForRisk: ('medium' | 'high' | 'critical')[]
  maxRuntimeMs: number
  maxInputSizeChars: number
  maxOutputSizeChars: number

  requireRecoveryPointBeforeExecution: true
  requireAuditEvent: true
  requireObservabilityEvent: true
  requireIdempotencyKey: true
  requireDeterministicOutput: true

  allowAutomaticFutureApproval: false
  allowRetry: false
  allowReplay: false
  allowRollback: false
  allowResumeExecution: false

  createdAt: string
  updatedAt: string
}
```

## Default Policy

Allowed:

- `internal_noop`
- `read_simulated` only if explicitly enabled

Denied:

- command
- Git
- legacy read
- legacy write
- file read
- file write
- PR
- deploy
- database / database migration
- external API
- MCP
- browser

## Safety Invariants

- Missing ToolExecutionPolicy means deny.
- Unknown category means deny.
- Legacy `read` and `write` categories are denied for Sprint 11 execution. Use `read_simulated` only for deterministic static fixture or in-memory simulated reads.
- Any conflict resolves to deny.
- ToolExecutionPolicy must not allow shell, Git, file, PR, deploy, delete, external API, MCP, browser, migration, queue, worker, retry, replay, rollback, or Agent continuation.
- ToolExecutionPolicy must not treat ReleaseReadiness or RegressionGate as execution tokens.
