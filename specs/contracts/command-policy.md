# Contract: CommandPolicy / PermissionProfile

Status: proposed for Sprint 6

## Purpose

CommandPolicy defines the default-deny permission model for tool proposals.

It is inspired by the `auto-dev-framework` default-deny command policy and adapted for the `coworker-a2a` Web / Prisma / Harmony architecture.

## CommandPolicy Schema

```ts
CommandPolicy {
  id: string
  version: string
  defaultDecision: 'deny'
  profiles: PermissionProfile[]
  forbiddenCapabilities: string[]
  createdAt: string
  updatedAt: string
}
```

## PermissionProfile Schema

```ts
PermissionProfile {
  id: string
  name: string
  description: string

  allowedToolCategories: string[]
  deniedToolCategories: string[]

  allowedCommands: string[]
  deniedCommands: string[]

  allowedPaths: string[]
  deniedPaths: string[]

  allowExternalApi: false
  allowShell: false
  allowGit: false
  allowFileWrite: false
  allowPr: false
  allowDeploy: false
  allowDelete: false
  allowDatabaseMigration: false
  allowMcp: false
  allowBrowserAutomation: false

  requiresHumanForRisk: ('medium' | 'high' | 'critical')[]
  maxInputSizeChars: number
  maxResultSizeChars: number
}
```

## Sprint 6 Default Profile

```ts
PermissionProfile {
  id: 'default-deny-sprint-6'
  name: 'Default Deny Sprint 6'
  description: 'Allows local proposal records only. Denies all real side effects.'
  allowedToolCategories: ['internal_noop', 'read']
  deniedToolCategories: [
    'write',
    'command',
    'git',
    'pr',
    'deploy',
    'database',
    'external_api',
    'mcp',
    'browser'
  ]
  allowedCommands: []
  deniedCommands: ['*']
  allowedPaths: []
  deniedPaths: ['*']
  allowExternalApi: false
  allowShell: false
  allowGit: false
  allowFileWrite: false
  allowPr: false
  allowDeploy: false
  allowDelete: false
  allowDatabaseMigration: false
  allowMcp: false
  allowBrowserAutomation: false
  requiresHumanForRisk: ['medium', 'high', 'critical']
  maxInputSizeChars: 12000
  maxResultSizeChars: 12000
}
```

## Evaluation Rules

1. Missing policy means deny.
2. Missing profile means deny.
3. Unknown tool means blocked.
4. Disabled tool means blocked.
5. Denied category means deny or requires human confirmation.
6. Destructive or open-world tool means requires human confirmation or blocked.
7. Non-empty sideEffects means requires human confirmation or blocked.
8. `read` category may create proposal-only or mock-only local records only.
9. Policy evaluation must not directly approve a ToolCall.
10. Approval may create an approved local record only through explicit user / Kelvin action.
11. No Sprint 6 policy can permit real execution.

## Read Category Boundary

`read` is an allowed category only for local proposal and deterministic mock records in Sprint 6.

Sprint 6 `read` tools must not:

- read files from the filesystem
- read network resources
- call external APIs
- invoke MCP tools
- automate browsers
- inspect environment variables
- access secrets
- query external knowledge stores

Any future real read capability must be introduced by a later Sprint with a separate permission and sandbox contract.

## Mock-only Boundary

`mock_only` means deterministic local mock. It must not access:

- filesystem
- network
- shell
- Git
- MCP
- browser automation
- external APIs
- database mutation paths

## Safety Invariants

- Default decision is always deny.
- `allowedCommands` must remain empty in Sprint 6.
- `deniedCommands` must include `*` in Sprint 6.
- Policy evaluation must not call the tool being evaluated.
- Policy evaluation must not inspect secrets or full environment dumps.
- Policy evaluation must not directly set ToolCall status to `approved_record`.

## Sprint 10 Production Hardening Boundary

Sprint 10 keeps CommandPolicy and PermissionProfile as default-deny production safety controls.

Additional Sprint 10 fields may be added when implemented:

```ts
PermissionProfile {
  securityPolicyRef?: string
  agentPermissionBoundaryRef?: string
  apiAuthBoundaryRef?: string
  secretRedactionPolicyRef?: string
  productionObservabilityPolicyRef?: string
}
```

Sprint 10 rules:

1. Missing SecurityPolicy means deny.
2. Missing AgentPermissionBoundary means deny for Agent-originated actions.
3. Missing ApiAuthBoundary means deny mutation.
4. Permission evaluation must remain idempotent and must not approve records automatically.
5. Kelvin approval may approve local records only and must not authorize execution.
6. CommandPolicy must not permit shell, Git, file write, PR, deploy, delete, external API, MCP, browser automation, A2A dispatch, Agent startup, Tool execution, auto-fix, or permission bypass in Sprint 10.
7. `read` remains proposal-only, mock-only, or view-only unless a later Sprint explicitly introduces real read permissions.

Sprint 10 does not introduce `allow_execute`, `allow_shell`, `allow_git`, `allow_file_write`, `allow_pr`, `allow_deploy`, `allow_external_api`, `allow_mcp`, or `allow_dispatch`.

## Sprint 11 Controlled Tool Runtime Boundary

Sprint 11 keeps CommandPolicy default-deny but may add a separate ToolExecutionPolicy for controlled local execution.

PermissionProfile may allow:

```ts
allowedToolCategories: ['internal_noop']
optionalAllowedToolCategories: ['read_simulated']
```

PermissionProfile must deny:

```ts
deniedToolCategories: [
  'command',
  'git',
  'file_read',
  'file_write',
  'pr',
  'deploy',
  'database',
  'database_migration',
  'external_api',
  'mcp',
  'browser'
]
```

Rules:

1. Default decision remains deny.
2. Missing ToolExecutionPolicy means deny.
3. `internal_noop` may be executed only through ToolExecutionPlan and `execute-approved`.
4. `read_simulated` may be executed only if deterministic and explicitly enabled.
5. `read_simulated` must not read real files, network, databases, environment variables, secrets, MCP, browsers, or external APIs.
6. CommandPolicy approval is not enough to execute. ToolExecutionPolicy, ToolSandbox, ToolPermission, ToolExecutionPlan, RecoveryPoint, and required Kelvin confirmation are also required.
7. CommandPolicy must not create automatic future approvals.
