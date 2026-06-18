# Contract: ToolSandbox

Status: proposed for Sprint 11

## Purpose

ToolSandbox defines the hard execution boundary for controlled local ToolExecutor execution.

Sprint 11 sandboxing is policy-level and implementation-level guardrails for deterministic local execution. It does not grant shell or filesystem access.

## Schema

```ts
ToolSandbox {
  id: string
  sandboxVersion: string
  mode: 'local_deterministic'

  allowShell: false
  allowGit: false
  allowFileRead: false
  allowFileWrite: false
  allowNetwork: false
  allowExternalApi: false
  allowMcp: false
  allowBrowser: false
  allowDatabaseMigration: false
  allowEnvironmentRead: false
  allowQueue: false
  allowWorker: false

  maxRuntimeMs: number
  maxInputSizeChars: number
  maxOutputSizeChars: number

  createdAt: string
  updatedAt: string
}
```

## Required Default

```ts
ToolSandbox {
  id: 'local-deterministic-sandbox-sprint-11'
  mode: 'local_deterministic'
  allowShell: false
  allowGit: false
  allowFileRead: false
  allowFileWrite: false
  allowNetwork: false
  allowExternalApi: false
  allowMcp: false
  allowBrowser: false
  allowDatabaseMigration: false
  allowEnvironmentRead: false
  allowQueue: false
  allowWorker: false
}
```

## Safety Invariants

- Any sandbox capability not listed must be treated as denied.
- Any sandbox configuration conflict resolves to deny execution.
- Sandbox approval must not override ToolExecutionPolicy.
- Sandbox approval must not override CommandPolicy, SecurityPolicy, or AgentPermissionBoundary.
- ToolRun must not execute if sandbox allows any forbidden capability.
