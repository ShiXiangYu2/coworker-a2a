# Contract: AuditLogQuery

Status: proposed for Sprint 8

## Purpose

AuditLogQuery defines the read-only query model for append-only AuditEvent and ObservabilityEvent records.

It exists so users can inspect what happened without triggering replay, retry, resume execution, or target mutation.

## Query Filters

```ts
AuditLogQuery {
  correlationId?: string
  eventType?: string
  category?: string
  severity?: 'debug' | 'info' | 'warn' | 'error' | 'critical'

  taskId?: string
  routeDecisionId?: string
  agentRunId?: string
  agentResultId?: string
  toolCallId?: string
  toolPermissionId?: string
  evalRunId?: string
  memoryEntryId?: string
  knowledgeItemId?: string
  a2aMessageId?: string
  contextPacketId?: string
  confirmationArtifactId?: string
  recoveryPointId?: string
  resumeTokenId?: string

  actorType?: string
  createdFrom?: string
  createdTo?: string
  limit?: number
  cursor?: string
  order?: 'asc' | 'desc'
}
```

## Response

```ts
AuditTimelineResponse {
  correlationId?: string
  events: ObservabilityEvent[]
  auditEvents: AuditEvent[]
  journals: RunJournal[]
  recoveryPoints: RecoveryPoint[]
  failures: FailureClassification[]
  summary: {
    eventCount: number
    auditEventCount: number
    warningCount: number
    errorCount: number
    confirmationCount: number
    recoveryPointCount: number
    failureCount: number
  }
}
```

## Append-only Rule

Audit query records must not be edited or deleted through this model.

Corrections must append new events such as:

- `*.corrected`
- `*.superseded`
- `failure.classified`
- `recovery.point_created`

## Safety Invariants

- AuditLogQuery is read-only.
- Querying audit logs must not mutate target records.
- Querying audit logs must not create AgentRun, ToolCall, ToolRun, MemoryEntry, A2AMessage, EvalRun, or RecoveryPoint records.
- Querying audit logs must not start resume execution.
