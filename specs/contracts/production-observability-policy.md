# Contract: ProductionObservabilityPolicy

Status: proposed for Sprint 10

## Purpose

ProductionObservabilityPolicy defines the production-ready observability requirements for local records, audit views, readiness checks, and future deployment readiness.

It builds on Sprint 8 ObservabilityEvent, AuditEvent, RunJournal, RecoveryPoint, ResumeToken, FailureClassification, and CorrelationId.

## Schema

```ts
ProductionObservabilityPolicy {
  id: string
  policyVersion: string
  status: 'draft' | 'active' | 'archived'

  correlationRequired: true
  auditRequiredForMutations: true
  observabilityRequiredForHighRiskEvents: true
  redactionRequired: true

  requiredCorrelationSurfaces: (
    | 'chat_message'
    | 'route_decision'
    | 'harmony_task'
    | 'agent_run'
    | 'agent_result'
    | 'memory_entry'
    | 'knowledge_item'
    | 'context_packet'
    | 'a2a_message'
    | 'tool_call'
    | 'tool_permission'
    | 'tool_run'
    | 'eval_target'
    | 'eval_run'
    | 'collaboration_session'
    | 'a2a_thread'
    | 'a2a_turn'
    | 'handoff_request'
    | 'collaboration_decision'
    | 'release_readiness_checklist'
    | 'regression_gate'
  )[]

  requiredAuditFields: string[]
  requiredObservabilityFields: string[]
  forbiddenPayloadClasses: string[]

  retentionPolicy: {
    auditEvents: 'append_only'
    observabilityEvents: 'append_only'
    runJournals: 'append_only'
    recoveryPoints: 'view_only'
    resumeTokens: 'view_only'
  }

  createdAt: string
  updatedAt: string
}
```

## Rules

1. All mutations require AuditEvent.
2. High-risk events require ObservabilityEvent.
3. All Sprint 10 production readiness records require correlationId.
4. Timeline views are inspect-only.
5. Audit summaries are read-only.
6. Observability records must not trigger retry, replay, restore, deploy, or execution.
7. Blocked payloads must not be included in observability records.

## Safety Invariants

- Observability is not orchestration.
- Audit is not execution.
- RunJournal is not replay input.
- RecoveryPoint is not database restore input.
- ResumeToken is not execution resume input.
- FailureClassification retryability is advisory only.
