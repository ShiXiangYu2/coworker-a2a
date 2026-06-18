# Contract: A2A Collaboration Safety

Status: proposed for Sprint 9

## Purpose

This contract prevents Sprint 9 Multi-Agent Collaboration from becoming an implicit Tool Runtime, message dispatcher, or autonomous Agent loop.

## Core Boundary

Sprint 9 is local controlled orchestration only.

Allowed:

- create local CollaborationSession records.
- create local A2AThread records.
- create local A2ATurn records.
- create local HandoffRequest records.
- create local CollaborationDecision records.
- write AuditEvent and ObservabilityEvent.
- create RecoveryPoint and ResumeToken records for inspection.
- create EvalTarget / EvalRun records through explicit eval APIs.

Forbidden:

- send A2A messages.
- dispatch A2A messages.
- enqueue A2A work.
- start target Agents.
- auto-create next turns.
- run autonomous loops.
- execute Tool Runtime.
- call MCP or external APIs.
- run shell or Git.
- write, patch, format, or delete files.
- create PRs.
- deploy.
- auto-complete Task.
- auto-write approved Memory / Knowledge.

## Kelvin Boundary

Kelvin review is required for:

- high or critical risk CollaborationSession.
- handoff to Kelvin.
- handoff involving deploy, delete, production, credentials, permissions, external communication, or customer-sensitive content.
- CollaborationDecision that recommends future Tool execution, file mutation, external API, deploy, delete, or PR creation.
- any attempt to continue a collaboration after a blocked or waiting_human state.

Kelvin approval may only:

- set local collaboration record status to approved or active.
- write AuditEvent.
- write ObservabilityEvent.

Kelvin approval must not:

- start AgentRun.
- execute tools.
- dispatch A2A.
- write Memory / Knowledge approved records.
- mark Task completed.
- call external APIs.

## Agent Role Boundaries

Elon / CEO:

- may propose collaboration plan records.
- may assign local responsibilities.
- must not start Agents.

Jobs / Product:

- may contribute product scope, user value, and prioritization turns.
- must not modify specs or files in Sprint 9.

Linus / Engineering:

- may contribute implementation analysis, risks, and dependencies.
- must not execute shell, Git, file writes, PR, deploy, or Tool Runtime.

Turing / Verification:

- may critique, verify, and recommend quality gates.
- must not auto-fix or mutate target records.

Bezos / Customer:

- may contribute customer impact and feedback framing.
- must not send external customer messages.

Kelvin / Human Owner:

- reviews high-risk records.
- approval changes local status only.

## Required Tests

- approved A2AMessage does not auto-create CollaborationSession.
- CollaborationSession creation does not start AgentRun.
- Handoff approval does not start target Agent.
- A2ATurn approval does not send or dispatch messages.
- CollaborationDecision approval does not execute Tool or complete Task.
- Sprint 9 API route paths do not contain forbidden execution semantics.
- Sprint 9 imports do not reference Tool executor, shell, Git, file write, external API, MCP, worker, queue, or browser automation.

## Sprint 10 Production Hardening Boundary

Sprint 10 production hardening may inspect local collaboration records, but it must not turn the collaboration layer into execution.

Sprint 10 may:

- verify AgentProfile and AgentPermissionBoundary coverage for collaboration participants.
- verify collaboration plans do not contain execution claims.
- verify UI and API labels avoid dispatch, send, start, run, execute, and auto-continue semantics.
- include collaboration records in ReleaseReadinessChecklist and RegressionGate evidence.

Sprint 10 must not:

- send A2A messages.
- dispatch A2A messages.
- start target Agents.
- create next turns automatically.
- run autonomous loops.
- execute tools.
- approve ToolCall records.
- write approved Memory / Knowledge records.
- complete Tasks.
- call external APIs or MCP.
- run shell, Git, file writes, PR, deploy, delete, queue, worker, or browser automation paths.
