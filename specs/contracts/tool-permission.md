# Contract: ToolPermission

Status: proposed for Sprint 6

## Purpose

ToolPermission records the result of evaluating a ToolCall against ToolRegistry and CommandPolicy.

It explains why a ToolCall is denied, blocked, requires human confirmation, or may be kept as a local approved record.

## Schema

```ts
ToolPermission {
  id: string
  toolCallId: string
  toolId: string

  decision:
    | 'allow_record_only'
    | 'deny'
    | 'requires_human'
    | 'blocked'

  reason: string
  evaluatedBy: 'policy'
  policyRef: string
  permissionProfileRef: string

  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  inputValidationStatus: 'valid' | 'invalid' | 'skipped'
  schemaValidationErrors?: string[]
  matchedRules: string[]
  deniedRules: string[]

  createdAt: string
}
```

## Decision Meaning

- `allow_record_only`: local ToolCall record may proceed without execution.
- `deny`: policy denies the proposal.
- `requires_human`: Kelvin review is required.
- `blocked`: proposal is unsafe, unknown, disabled, invalid, or out of scope.

## Input Validation

`inputValidationStatus` records whether ToolCall input matched the ToolDefinition input schema.

- `valid`: input matches the schema.
- `invalid`: input does not match the schema and must not proceed.
- `skipped`: validation was skipped only because the tool was unknown, disabled, or blocked before schema validation.

`schemaValidationErrors` should include short, sanitized messages. It must not include secrets, full file contents, full command output, environment dumps, or private tokens.

## Safety Invariants

- Sprint 6 must not include `allow_execute`.
- Human approval cannot mutate `decision` into execute permission.
- Permission evaluation must be deterministic and auditable.
- Missing policy must be treated as deny.
- Policy evaluation must be idempotent for the same ToolCall, ToolDefinition version, CommandPolicy version, and normalized input.
- Invalid input must not create an executable ToolRun.

## Sprint 7 Eval Boundary

ToolPermission may be evaluated by Sprint 7 Eval / Verification / Quality Gate.

Allowed:

- EvalTarget may reference a ToolPermission.
- EvalRun may check `decision`, risk, input validation status, matched rules, denied rules, and default-deny consistency.
- EvalFinding may recommend Kelvin review for unclear, high-risk, or blocked decisions.

Disallowed:

- Eval must not mutate ToolPermission.
- Eval must not convert any decision into execute permission.
- Eval must not approve ToolCall records.
- Eval must not start ToolRun execution.

## Sprint 8 Observability / Recovery / Resume Boundary

Sprint 8 may observe ToolPermission records and include sanitized policy summaries in ObservabilityEvent, RunJournal, RecoveryPoint, and FailureClassification records.

Sprint 8 must not:

- mutate ToolPermission decisions.
- turn `allow_record_only` into execution permission.
- re-evaluate permissions automatically from resume.
- approve ToolCalls.
- create executable ToolRuns.
- call Tool Runtime, shell, Git, file, PR, deploy, delete, database, external API, MCP, browser, queue, or worker paths.

## Sprint 10 Production Hardening Boundary

Sprint 10 may inspect ToolPermission records through SecurityPolicy, AgentPermissionBoundary, ApiAuthBoundary, SecretRedactionPolicy, ProductionObservabilityPolicy, ReleaseReadinessChecklist, and RegressionGate.

Allowed:

- verify CommandPolicy default-deny.
- verify ToolPermission has sanitized validation errors.
- verify permission evaluation did not auto-approve ToolCall.
- verify `allow_record_only` remains local-record only.
- include sanitized ToolPermission summaries in release readiness and regression evidence.

Disallowed:

- Sprint 10 must not create execute permission.
- Sprint 10 must not create executable ToolRun.
- Sprint 10 must not approve ToolCall automatically.
- Sprint 10 must not call Tool Runtime, shell, Git, file, PR, deploy, delete, database, external API, MCP, browser, queue, worker, or auto-fix paths.
- Sprint 10 must not use ToolPermission as a deployment readiness trigger.

## Sprint 11 Controlled Execution Permission

Sprint 11 may extend ToolPermission decisions for controlled execution:

```ts
decision:
  | 'allow_record_only'
  | 'allow_controlled_execution'
  | 'deny'
  | 'requires_human'
  | 'blocked'
```

`allow_controlled_execution` means only that a specific ToolRun may continue toward ToolExecutionPlan and confirmation under Sprint 11 ToolExecutionPolicy.

It does not:

- execute the ToolRun.
- approve future ToolRuns.
- bypass Kelvin confirmation.
- bypass RecoveryPoint.
- bypass ToolSandbox.
- bypass explicit `execute-approved`.

Sprint 11 permission may allow only:

- `internal_noop`
- deterministic `read_simulated`

All command, Git, file read, file write, PR, deploy, database migration, external API, MCP, browser, queue, worker, retry, replay, rollback, Agent continuation, and open-world categories must be denied or blocked.
