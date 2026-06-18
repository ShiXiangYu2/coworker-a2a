# Contract: FailureClassification

Status: proposed for Sprint 8

## Purpose

FailureClassification records a sanitized, structured explanation of failures across Sprint 1-8 local flows.

It supports debugging, UI display, audit, and future recovery planning without triggering retry or repair behavior.

## Schema

```ts
FailureClassification {
  id: string
  schemaVersion: string
  correlationId: string

  failureType:
    | 'validation_error'
    | 'policy_denied'
    | 'confirmation_required'
    | 'state_transition_denied'
    | 'idempotency_conflict'
    | 'not_found'
    | 'timeout'
    | 'cancelled'
    | 'producer_error'
    | 'persistence_error'
    | 'redaction_blocked'
    | 'unknown'

  severity: 'low' | 'medium' | 'high' | 'critical'
  resourceType: string
  resourceId?: string

  message: string
  sanitizedDetails?: Json

  retryable: boolean
  userActionRequired: boolean
  kelvinReviewRecommended: boolean

  sourceEventId?: string
  createdAt: string
}
```

## Classification Rules

- Invalid input or schema mismatch -> `validation_error`.
- Default-deny or policy mismatch -> `policy_denied`.
- Human review needed -> `confirmation_required`.
- Illegal state transition -> `state_transition_denied`.
- Idempotency mismatch -> `idempotency_conflict`.
- Missing referenced resource -> `not_found`.
- Deterministic producer failure -> `producer_error`.
- Database write/read failure -> `persistence_error`.
- Redaction could not safely sanitize payload -> `redaction_blocked`.

## Retryable Meaning

`retryable` is an advisory flag for future human review and future sprint design only.

In Sprint 8, `retryable = true` must not trigger:

- automatic retry
- automatic replay
- automatic recovery
- automatic resume execution
- Kelvin approval
- Task status mutation
- AgentRun, ToolRun, EvalRun, Memory, Knowledge, or A2A lifecycle actions

## Safety Invariants

- FailureClassification must not trigger retries.
- FailureClassification must not trigger replay or recovery.
- FailureClassification must not auto-request Kelvin approval or review unless a separate explicit future ConfirmationArtifact flow exists.
- FailureClassification must not mutate target status.
- FailureClassification details must be sanitized.
