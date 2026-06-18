# Contract: IntegrationAuditPolicy

Status: proposed for Sprint 13

## Purpose

IntegrationAuditPolicy defines what must be audited for External Integration / MCP governance records.

It is an audit policy only. It must not create execution workers, dispatchers, webhooks, or external connections.

## Schema

```ts
IntegrationAuditPolicy {
  id: string
  policyVersion: string
  correlationId: string
  targetSprint: 'sprint_13'

  requiredAuditEvents: string[]
  requiredObservabilityEvents: string[]
  requiredRedactionChecks: string[]
  forbiddenPayloadFields: string[]
  blockedPayloadSurfaces: (
    | 'audit_detail'
    | 'observability_detail'
    | 'recovery_point'
    | 'run_journal'
    | 'resume_token'
    | 'eval_evidence'
    | 'agent_prompt'
    | 'external_action_proposal'
    | 'integration_profile'
    | 'mcp_profile'
  )[]

  allowRawExternalPayload: false
  allowSecretsInMetadata: false
  allowWebhookDispatch: false

  createdAt: string
  updatedAt: string
}
```

## Field Rules

- `allowWebhookDispatch` must always be `false` in Sprint 13.
- Sprint 13 has no audit-only webhook dispatch mode.
- Audit records may describe proposed webhook governance, but they must never dispatch, simulate dispatch, enqueue dispatch, or validate webhook delivery.

## Required Audit Events

- `external_integration_profile.created`
- `external_integration_profile.submitted_for_review`
- `external_integration_profile.approved_record`
- `external_integration_profile.rejected`
- `external_integration_profile.archived`
- `mcp_connection_profile.created`
- `mcp_connection_profile.submitted_for_review`
- `mcp_connection_profile.approved_record`
- `mcp_connection_profile.rejected`
- `mcp_connection_profile.archived`
- `external_action.proposal_created`
- `external_action.submitted_for_review`
- `external_action.approved_record`
- `external_action.rejected`
- `external_action.superseded`
- `external_action.archived`
- `integration_risk.assessment_created`
- `integration_risk.approved_record`
- `integration_risk.rejected`
- `external_action_review.created`
- `external_action_review.approved_record`
- `external_action_review.rejected`
- `external_action_review.archived`
- `integration_audit_policy.recorded`

## Safety Invariants

- Audit records must not contain secrets or raw external payloads.
- Blocked payloads must not enter audit details, observability details, RecoveryPoint, RunJournal, ResumeToken, Eval evidence, Agent prompts, or Sprint 13 governance records.
- Audit policy must not be interpreted as permission to dispatch or execute anything.
- No webhook dispatch exists in Sprint 13, including audit-only dispatch.
