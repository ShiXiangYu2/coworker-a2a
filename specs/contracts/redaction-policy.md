# Contract: RedactionPolicy

Status: proposed for Sprint 8

## Purpose

RedactionPolicy defines what may be stored in ObservabilityEvent, AuditEvent payloads, RunJournal snapshots, RecoveryPoint snapshots, ResumeToken context, and FailureClassification details.

## Redaction Status

```ts
RedactionStatus = 'not_required' | 'redacted' | 'blocked'
```

- `not_required`: payload contains no sensitive data.
- `redacted`: sensitive data was removed or summarized.
- `blocked`: payload could not be safely sanitized and must not be persisted.

## Redaction Metadata

Records that store sanitized snapshots or payload summaries should include:

```ts
{
  redactionVersion: string
  redactionStatus: RedactionStatus
  redactedFields?: string[]
  blockedReason?: string
}
```

`redactionVersion` identifies the redaction rules used to produce the stored payload.

`redactedFields` should contain field paths or logical names, not original sensitive values.

`blockedReason` should be a short sanitized explanation.

## Never Store

- API keys
- access tokens
- refresh tokens
- passwords
- private keys
- cookies
- raw environment dumps
- `.env` file contents
- full shell stdout or stderr
- full file contents
- complete command history
- raw external API payloads
- private user data beyond compact summaries

## Allowed Summaries

Allowed:

- resource IDs
- status before / after
- event type
- short user-facing summaries
- validation error summaries
- policy decision summaries
- counts
- hashes of normalized snapshots
- compact excerpts that do not expose secrets or complete file contents

## Block Rule

If a payload cannot be safely redacted, do not persist the sensitive payload.

Instead:

1. write a `FailureClassification` with `failureType = 'redaction_blocked'`.
2. write an ObservabilityEvent with `redactionStatus = 'blocked'`.
3. return a structured validation error to the caller.

Blocked payloads must not be persisted into:

- RecoveryPoint snapshots
- RunJournal snapshots
- ResumeToken context
- AuditEvent payloads
- ObservabilityEvent snapshots
- FailureClassification details

## Safety Invariants

- Redaction must happen before persistence.
- UI must not display blocked payloads.
- ResumeToken must not expose unredacted snapshots.
- RecoveryPoint must not store raw sensitive payloads.

## Sprint 10 Production Redaction Boundary

Sprint 10 extends redaction coverage to production security surfaces.

Blocked payloads must also not be persisted into:

- AgentProfile prompt previews.
- AgentPermissionBoundary evidence.
- SecurityPolicy review payloads.
- SkillIOContract examples.
- ReleaseReadinessChecklist evidence.
- RegressionGate evidence.
- ApiAuthBoundary records.
- ProductionObservabilityPolicy records.
- CollaborationSession plan source snapshots.
- ToolCall policy input snapshots.
- Agent prompt context.
- Eval evidence.

Sprint 10 redaction may create sanitized `redaction.blocked_payload` AuditEvent and ObservabilityEvent records, but those records must contain only blocked reason, redacted field names, resource IDs, and compact summaries.
