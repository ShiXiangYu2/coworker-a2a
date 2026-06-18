# Contract: correlationId

Status: proposed for Sprint 8

## Purpose

correlationId is the cross-module identifier that connects one user request or product flow across ChatHub, Router, Harmony, Agent Runtime, Memory, Knowledge, A2A, Tool proposals, Eval, Audit, Recovery, and Resume.

## Generation Rule

If a ChatHub request does not provide a correlationId, the server creates one.

Recommended format:

```text
corr_<ulid-or-cuid>
```

## Propagation Rule

The same correlationId must be copied through:

- ChatHub message
- RouteDecision
- Harmony Task
- TaskRun / TaskStep
- AgentRun / AgentStep / AgentResult
- ContextPacket
- MemoryEntry
- KnowledgeItem
- A2AMessage
- ToolCall
- ToolPermission
- ToolRun placeholder or mock-only record
- EvalTarget
- EvalRun
- ConfirmationArtifact
- AuditEvent
- ObservabilityEvent
- RunJournal
- RecoveryPoint
- ResumeToken
- FailureClassification
- AgentProfile
- AgentPermissionBoundary
- SecurityPolicy
- SkillIOContract
- ReleaseReadinessChecklist
- RegressionGate
- ApiAuthBoundary
- ProductionObservabilityPolicy

## Causation Rule

Use `causationId` or resource-specific IDs to record direct cause.

Example:

```text
ChatHubMessage(corr_1)
  -> RouteDecision(corr_1, causationId=message_1)
  -> Task(corr_1, causationId=route_decision_1)
  -> AgentRun(corr_1, causationId=task_1)
  -> EvalRun(corr_1, causationId=agent_result_1)
```

## Forking Rule

Sprint 8 does not introduce autonomous flow forks.

If a future sprint creates a truly independent request, it may create a new correlationId and store `parentCorrelationId`. Sprint 8 should not need this for normal flow.

## Safety Invariants

- correlationId is not authorization.
- correlationId must not grant execution permission.
- Missing correlationId should be treated as validation error for Sprint 8 observability records.

## Sprint 10 Production Rule

Sprint 10 production hardening records should use the same correlationId when they are created from an existing ChatHub, Task, AgentRun, ToolCall, EvalRun, Recovery, or Collaboration flow.

If a Sprint 10 record is created as a standalone policy or readiness record, the server may create a new correlationId.

correlationId must not:

- grant auth.
- grant Agent permissions.
- bypass CommandPolicy.
- bypass SecurityPolicy.
- imply deployment readiness.
- imply execution readiness.
