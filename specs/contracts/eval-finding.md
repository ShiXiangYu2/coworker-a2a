# Contract: EvalFinding

Status: proposed for Sprint 7

## Purpose

EvalFinding records a human-readable issue, warning, or verification observation produced by an EvalRun.

Findings can request Kelvin review, but they do not fix or mutate the evaluated target.

## Schema

```ts
EvalFinding {
  id: string
  evalRunId: string
  evalTargetId: string
  relatedCheckIds: string[]

  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  category:
    | 'schema'
    | 'safety'
    | 'permission'
    | 'confirmation'
    | 'quality'
    | 'state'
    | 'regression'
    | 'provenance'
  title: string
  description: string
  targetPath?: string
  targetField?: string
  evidence: string[]
  evidenceRefs?: string[]
  recommendation: string

  status: 'open' | 'review_requested' | 'reviewed' | 'dismissed' | 'cancelled'
  needsHumanReview: boolean
  confirmationArtifactId?: string

  reviewedBy?: string
  reviewedAt?: string
  reviewDecision?: 'accepted' | 'dismissed' | 'deferred'
  reviewReason?: string

  createdAt: string
  updatedAt: string
}
```

## Human Review Rules

`needsHumanReview = true` when:

- severity is `high` or `critical`
- finding mentions secrets, permissions, production, deploy, database, migration, deletion, external communication, or future side effects
- target is already pending confirmation
- gate decision is `blocked` or `needs_human_review`

## Locator Fields

`targetPath`, `targetField`, and `evidenceRefs` are optional UI and audit helpers.

They must be sanitized. They must not contain:

- secrets
- full file contents
- full command output
- raw external API payloads
- private tokens
- environment variable dumps

## Safety Invariants

- Reviewing a finding changes only EvalFinding / ConfirmationArtifact / AuditEvent local state.
- Reviewing a finding must not mutate the evaluated target.
- Findings must not contain secrets, full file contents, full command output, raw private payloads, or raw external API payloads.
