# Contract: ToolDefinition

Status: proposed for Sprint 6

## Purpose

ToolDefinition describes a tool that the system can recognize for proposal and permission evaluation.

Sprint 6 ToolDefinition does not make a tool executable. It only supports registry lookup, schema validation, risk classification, permission evaluation, confirmation, audit, and UI display.

## Schema

```ts
ToolDefinition {
  id: string
  name: string
  displayName: string
  description: string
  category:
    | 'read_simulated'
    | 'read'
    | 'write'
    | 'command'
    | 'git'
    | 'pr'
    | 'deploy'
    | 'database'
    | 'external_api'
    | 'mcp'
    | 'browser'
    | 'internal_noop'
  version: string

  inputSchema: Json
  outputSchema?: Json

  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  isReadOnly: boolean
  isDestructive: boolean
  isOpenWorld: boolean
  requiresHumanConfirmation: boolean

  allowedAgentIds?: ('elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin')[]
  allowedTaskTypes?: string[]
  permissionProfileRef: string

  maxInputSizeChars?: number
  maxResultSizeChars?: number
  timeoutMs?: number

  enabled: boolean
  sprint6Mode: 'proposal_only' | 'mock_only' | 'disabled'
  sprint11ExecutionMode?: 'not_executable' | 'controlled_deterministic_local'
  executorId?: string
  sandboxId?: string
  executionPolicyRef?: string

  createdAt: string
  updatedAt: string
}
```

## Field Rules

- `category` drives default permission behavior.
- `riskLevel` must be conservative.
- `isDestructive = true` requires human confirmation.
- `isOpenWorld = true` requires human confirmation.
- `enabled = false` means ToolCall proposals must be denied or blocked.
- `sprint6Mode = proposal_only` means no ToolRun execution can start.
- `sprint6Mode = mock_only` may produce local mock records only.
- `sprint6Mode = disabled` means no proposal should proceed.

## Sprint 6 Required Defaults

ToolDefinitions for command, Git, file write, PR, deploy, database, external API, MCP, and browser categories must be disabled, blocked, or confirmation-only in Sprint 6.

No ToolDefinition may grant runtime execution in Sprint 6.

## Safety Invariants

- ToolDefinition is metadata, not execution authority.
- ToolDefinition must not contain secrets.
- ToolDefinition must not contain command templates that can be executed by Sprint 6 code.
- ToolDefinition cannot override CommandPolicy default-deny behavior.

## Sprint 11 Controlled Execution Boundary

Sprint 11 may mark only these categories as executable:

- `internal_noop`
- deterministic `read_simulated`

`read_simulated` is a new Sprint 11 category for deterministic static fixture or in-memory reads only. It must not read real files, network resources, databases, environment variables, secrets, MCP, browsers, or external APIs.

Sprint 11 executable ToolDefinition records must include:

- `sprint11ExecutionMode = controlled_deterministic_local`
- `executorId`
- `sandboxId`
- `executionPolicyRef`

All other categories must use:

```ts
sprint11ExecutionMode = 'not_executable'
```

Sprint 11 ToolDefinition still cannot override ToolExecutionPolicy, ToolSandbox, CommandPolicy, SecurityPolicy, AgentPermissionBoundary, Kelvin confirmation, or RecoveryPoint requirements.
