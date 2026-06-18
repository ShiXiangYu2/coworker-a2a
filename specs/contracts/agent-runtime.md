# Contract: Agent Runtime

Status: proposed for Sprint 4

## Purpose

Agent Runtime is the controlled analysis layer that lets a target Agent analyze a queued Harmony Task and return a structured AgentResult.

Sprint 4 Agent Runtime is analysis-only. It must not execute tools, commands, file edits, Git operations, PRs, deployments, deletes, Memory writes, A2A loops, or external APIs.

## AgentRuntime

```ts
AgentRuntime {
  id: string
  name: 'controlled_agent_runtime'
  version: string
  mode: 'analysis_only'
  enabledAgentIds: ('elon' | 'jobs' | 'linus' | 'turing' | 'bezos')[]
  modelIdentity?: 'claude_ceo'
  personaAlias?: 'elon'
  forbiddenActions: string[]
  createdAt: string
}
```

Sprint 4 may keep AgentRuntime as code configuration. A database table is not required.

## AgentRun

```ts
AgentRun {
  id: string
  correlationId?: string
  taskId: string
  taskRunId?: string
  taskStepId?: string
  contextPacketId?: string
  agentId: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'
  modelIdentity?: 'claude_ceo'
  personaAlias?: 'elon'
  status: 'created' | 'running' | 'completed' | 'blocked' | 'failed' | 'cancelled'
  trigger: 'manual' | 'task_ui' | 'api'
  runtimeMode: 'analysis_only'
  attempt: number
  idempotencyKey?: string

  inputSnapshot: Json
  result?: AgentResult
  error?: {
    code: string
    message: string
  }

  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}
```

## AgentStep

```ts
AgentStep {
  id: string
  agentRunId: string
  taskId: string
  agentId: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'
  index: number
  kind:
    | 'load_task_context'
    | 'build_agent_prompt'
    | 'llm_analysis'
    | 'validate_agent_result'
    | 'write_task_step'
    | 'write_audit_event'
  status: 'pending' | 'running' | 'completed' | 'blocked' | 'failed' | 'skipped'
  summary: string
  input?: Json
  output?: Json
  createdAt: string
  updatedAt: string
}
```

## Persistence Boundary

Recommended new tables:

- `AgentRun`
- `AgentStep`

Do not add:

- ToolCall
- ToolRun
- MemoryEntry
- Artifact
- AgentMessage
- A2ASession

Do not reuse Sprint 3 `TaskRun` as `AgentRun`.

## Harmony Writes

Agent Runtime must write:

- AgentRun
- AgentStep
- Harmony TaskStep summary
- AuditEvent

The Harmony TaskStep should summarize AgentResult for task visibility. Full Agent runtime detail belongs in AgentRun and AgentStep.

## Sprint 5 Context Boundary

Sprint 5 may attach a persisted ContextPacket to AgentRun input.

Allowed:

- `AgentRun.contextPacketId` may reference an explicit ContextPacket.
- `inputSnapshot` may include ContextPacket metadata and selected item snapshots.
- AgentRun may use approved local MemoryEntry and KnowledgeItem records only through a ContextPacket.

Disallowed:

- silently injecting all memory into prompts
- reading candidate, rejected, superseded, or archived memory
- reading draft, rejected, superseded, or archived knowledge
- calling external APIs, Obsidian, RAG, vector stores, or external knowledge bases
- writing approved memory directly from AgentRun

## Safety Invariants

- `runtimeMode` is always `analysis_only`.
- AgentRun.completed means analysis completed only.
- AgentRun.completed does not mean Task completed.
- AgentRun.completed does not mean tools or side effects completed.
- AgentRun.completed must not automatically set `Task.status = completed`.
- No Agent Runtime path may execute tools, shell, Git, file writes, PRs, deploys, deletes, A2A loops, or external APIs.
- Sprint 5 Agent Runtime may create MemoryEntry candidates only through the reviewed candidate flow.
- Sprint 5 Agent Runtime may create local A2AMessage drafts only. It must not send messages or start target Agents.

## Sprint 6 Tool Proposal Boundary

Sprint 6 may allow AgentRun results to include ToolCall candidates.

Allowed:

- AgentRun may produce `toolCallCandidates` inside AgentResult.
- ToolCall candidates may be persisted through an explicit ToolCall proposal API or user action.
- AgentRun input and output may reference ToolCall proposal IDs for audit after they are created.

Disallowed:

- AgentRun must not execute tools.
- AgentRun must not start ToolRun execution.
- AgentRun must not call shell, Git, file write, PR, deploy, delete, database, external API, MCP, or browser automation paths.
- AgentRun must not continue automatically after ToolCall approval.
- AgentRun.completed must not imply ToolCall approval, ToolRun completion, or Task completion.

Sprint 6 preserves `runtimeMode = analysis_only`.

## Sprint 7 Eval Boundary

Sprint 7 may evaluate AgentRun and AgentResult records.

Allowed:

- EvalTarget may reference AgentRun or AgentResult.
- EvalRun may check runtimeMode, status, contextPacketId, result schema, sideEffects, candidate boundaries, and prohibited claims.
- Turing may provide verification, critique, checklist results, and QualityGateDecision recommendations.

Disallowed:

- Eval must not create a new AgentRun by default.
- Eval must not continue AgentRun automatically.
- Eval must not mutate AgentRun status.
- Eval must not mark Task completed.
- Eval must not execute tools, shell, Git, file writes, PRs, deploys, deletes, Memory writes, A2A sends, external APIs, MCP, or browser automation.

Sprint 7 keeps Agent Runtime analysis-only. Verification is a separate local Eval record flow, not tool execution and not autonomous agent work.

## Sprint 8 Observability / Recovery / Resume Boundary

Sprint 8 may observe AgentRun records through ObservabilityEvent, RunJournal, RecoveryPoint, ResumeToken, and FailureClassification.

Allowed:

- record AgentRun timeline entries.
- create sanitized RecoveryPoint snapshots for AgentRun records.
- create view-only ResumeToken records that open AgentRun detail, audit, journal, and snapshots.
- classify AgentRun-related failures.

Disallowed:

- ResumeToken must not start or continue AgentRun.
- RecoveryPoint must not restore AgentRun status.
- RunJournal must not replay AgentRun steps.
- ObservabilityEvent must not invoke analysis result producers.
- FailureClassification must not retry AgentRun.
- Sprint 8 must not change `runtimeMode = analysis_only`.

## Sprint 9 Collaboration Boundary

Sprint 9 may reference AgentRun and AgentResult records when creating local CollaborationSession, A2AThread, A2ATurn, HandoffRequest, or CollaborationDecision records.

Allowed:

- AgentRun result may be copied into a sanitized local collaboration snapshot.
- AgentRun may be linked as sourceAgentRunId.
- AgentResult may propose a collaboration plan as a record candidate.

Disallowed:

- CollaborationSession creation must not start or continue AgentRun.
- A2ATurn creation must not create a new AgentRun.
- Handoff approval must not start target Agent.
- CollaborationDecision approval must not change AgentRun status.
- Sprint 9 must not change `runtimeMode = analysis_only`.

## Sprint 10 Production Hardening Boundary

Sprint 10 may define AgentProfile and AgentPermissionBoundary records for Agents referenced by AgentRuntime.

Sprint 10 must not introduce a new Agent Runtime execution path. Sprint 4 Agent Runtime remains `analysis_only`.

For CEO identity, Sprint 10 recommends:

```ts
{
  agentId: 'elon',
  modelIdentity: 'claude_ceo',
  personaAlias: 'elon'
}
```

This mapping preserves existing `elon` records while making Claude the explicit model-backed CEO identity. It must not create a new parallel CEO execution path.

Allowed:

- inspect AgentRuntime and AgentRun records for release readiness.
- verify `runtimeMode = analysis_only`.
- verify Claude CEO / Elon / Jobs / Linus / Turing / Bezos permission boundaries.
- include sanitized AgentRun summaries in RegressionGate and ReleaseReadinessChecklist evidence.

Disallowed:

- Sprint 10 must not start AgentRun.
- Sprint 10 must not continue AgentRun.
- Sprint 10 must not change `runtimeMode`.
- Sprint 10 must not mutate AgentRun status through SecurityPolicy, AgentProfile, ReleaseReadinessChecklist, or RegressionGate.
- Claude CEO must not execute tools, shell, Git, file writes, PRs, deploys, deletes, external APIs, MCP, A2A dispatch, or permission bypass.
- Release readiness approval must not start or resume Agent Runtime.
- Sprint 10 must not add a new CEO execution path for `claude_ceo`.
- `claude_ceo` and `elon` must not both be active CEO execution identities.
- API auth role, audit actorType, ReleaseReadiness approval, RegressionGate pass, or SecurityPolicy review must not start or continue AgentRuntime.
