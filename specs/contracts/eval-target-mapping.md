# Contract: Eval Target Mapping

Status: proposed for Sprint 7

## Purpose

This contract defines how existing Sprint 1-6 records become EvalTarget records.

Mappings must be deterministic, sanitized, and side-effect free.

## Supported Targets

| Target | Required Snapshot Fields | Primary Checks |
| --- | --- | --- |
| RouteDecision | route type, targetAgentId, confidence, status, next, sideEffects, matchedSignals | intent coverage, confidence, human confirmation, unsupported routing |
| Harmony Task | status, targetAgentId, source RouteDecision, confirmation, audit summary | legal status, queued/assigned boundaries, non-execution, audit trail |
| AgentRun | status, agentId, runtimeMode, taskId, contextPacketId, result summary | analysis-only boundary, no auto task completion, context traceability |
| AgentResult | status, confidence, proposedChanges, sideEffects, next, candidates | schema, sideEffects empty, prohibited claims, candidate boundaries |
| MemoryEntry | status, kind, scope, confidence, tags, provenance | candidate/approved boundary, review need, context eligibility |
| KnowledgeItem | status, scope, confidence, provenance, tags | curated knowledge quality, review need, context eligibility |
| ContextPacket | status, taskId, agentRunId, selected item summaries, selection rules, token budget, supersession links | audit reproducibility, deterministic selection quality, context safety |
| A2AMessage | status, fromAgentId, toAgentId, intent, subject, requiresHumanConfirmation | local-only draft, no send/dispatch/start semantics |
| ToolCall | status, toolId, riskLevel, sideEffects, permissionDecisionId, confirmationArtifactId | proposal-only, policy linkage, confirmation boundary |
| ToolPermission | decision, riskLevel, inputValidationStatus, matchedRules, deniedRules | default-deny, no execute permission, validation clarity |

## Mapping Rules

- Use exact local record IDs.
- Include compact linked IDs instead of full linked object graphs.
- Include sanitized summaries instead of full raw payloads.
- Include enough status and risk data to reproduce the EvalRun.
- Preserve `correlationId` when available.
- Use `idempotencyKey` to avoid duplicate EvalTargets for the same target snapshot.

## ContextPacket Mapping

ContextPacket may be evaluated in Sprint 7 only for:

- audit and reproducibility completeness
- deterministic context selection quality
- confidence, scope, tag, and token budget consistency
- supersession traceability
- absence of candidate, rejected, superseded, or archived records in selected context

ContextPacket eval must not:

- attach ContextPacket
- detach ContextPacket
- supersede ContextPacket
- start AgentRun
- mutate AgentRun inputSnapshot
- silently inject context into an Agent prompt

## Disallowed Mapping Behavior

Mapping must not:

- call external APIs
- read files or network resources
- query MCP or browser sessions
- execute tools
- create ToolCalls
- approve records
- start AgentRuns
- mutate target records
- silently inject Memory or Knowledge into Agent prompts
