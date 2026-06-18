# Tasks: Sprint 9 - Multi-Agent Collaboration / A2A Runtime

Status: proposed

## Specs

- [ ] Add Sprint 9 PRD.
- [ ] Add Sprint 9 implementation plan.
- [ ] Add Sprint 9 task list.
- [ ] Add AgentTeam contract.
- [ ] Add CollaborationSession contract.
- [ ] Add A2AThread contract.
- [ ] Add A2ATurn contract.
- [ ] Add HandoffRequest contract.
- [ ] Add CollaborationDecision contract.
- [ ] Add A2A Runtime state machine contract.
- [ ] Add A2A collaboration safety contract.
- [ ] Update Sprint 1-8 contracts with Sprint 9 boundaries.

## Implementation Tasks

- [ ] Add TypeScript types for Sprint 9 contracts.
- [ ] Add pure state transition rules.
- [ ] Add deterministic A2ATurn sequence rules.
- [ ] Add CEO collaboration plan to local-record mapper.
- [ ] Add A2AMessage approved_record to CollaborationSession mapper.
- [ ] Add sanitized CollaborationSession plan source snapshot mapper.
- [ ] Add Kelvin confirmation rule helpers.
- [ ] Add local collaboration persistence.
- [ ] Add AuditEvent and ObservabilityEvent writers.
- [ ] Add RunJournal append rules for session / thread / turn.
- [ ] Add RecoveryPoint snapshot support for collaboration records.
- [ ] Add view-only ResumeToken support for collaboration records.
- [ ] Add EvalTarget mapping for collaboration records.

## API Tasks

- [ ] Implement AgentTeam read APIs.
- [ ] Implement CollaborationSession APIs.
- [ ] Implement A2AThread APIs.
- [ ] Implement A2ATurn APIs.
- [ ] Implement HandoffRequest APIs.
- [ ] Implement CollaborationDecision APIs.
- [ ] Implement linked Task / AgentRun / A2AMessage query APIs.
- [ ] Ensure every mutation returns `auditEvents` and/or `observabilityEvents`.
- [ ] Ensure no Sprint 9 API route introduces send, dispatch, start-agent, execute, run-tool, auto-continue, start-a2a-loop, enqueue, deliver, external call, or complete-task semantics.
- [ ] Ensure no Sprint 9 API route path contains execution semantics except explicitly allowed local-record verbs.

## UI Tasks

- [ ] Add `Create Collaboration Session` entry for approved A2AMessage records.
- [ ] Add `View Collaboration Timeline`.
- [ ] Add Task card collaboration count.
- [ ] Add Collaboration Session card.
- [ ] Add A2A Thread / Turn display.
- [ ] Add Handoff display.
- [ ] Add Collaboration Decision display.
- [ ] Add Sprint 9 safety note.
- [ ] Remove or block misleading execution wording.

## Tests

- [ ] CollaborationSession state machine tests.
- [ ] A2AThread state machine tests.
- [ ] A2ATurn state machine tests.
- [ ] HandoffRequest state machine tests.
- [ ] CollaborationDecision state machine tests.
- [ ] A2AMessage approved_record requires explicit action before CollaborationSession creation.
- [ ] CollaborationSession creation does not start AgentRun.
- [ ] CollaborationSession `open-record` does not create AgentRun.
- [ ] CollaborationSession `open-record` does not create A2ATurn.
- [ ] CollaborationSession `open-record` does not create ToolCall / ToolRun.
- [ ] CollaborationSession `open-record` does not mutate Task status.
- [ ] CollaborationSession plan source snapshot is sanitized.
- [ ] A2ATurn creation does not dispatch or send messages.
- [ ] Handoff approval does not start target Agent.
- [ ] CollaborationDecision approval does not execute Tool.
- [ ] CollaborationDecision approval does not mark Task completed.
- [ ] Kelvin approval changes local collaboration record only.
- [ ] Kelvin approval does not trigger AgentRun, ToolCall, A2ATurn automatic creation, or Task completed.
- [ ] Sprint 8 ResumeToken remains view-only for collaboration records.
- [ ] Sprint 7 Eval remains recommendation-only for collaboration records.
- [ ] forbidden imports / forbidden side-effect paths.
- [ ] API route forbidden execution semantics.
- [ ] Sprint 1 `/api/chat` SSE regression.
- [ ] Sprint 2 `/api/agent-router/route` regression.
- [ ] Sprint 3 Harmony Task Engine regression.
- [ ] Sprint 4 Agent Runtime regression.
- [ ] Sprint 5 Memory / Knowledge / local A2A regression.
- [ ] Sprint 6 Tool Integration / Permission / CommandPolicy regression.
- [ ] Sprint 7 Eval / Verification / Quality Gate regression.
- [ ] Sprint 8 Observability / Audit / Recovery / Resume regression.

## Non-goals

- [ ] Do not implement true cross-process A2A communication.
- [ ] Do not implement autonomous loops.
- [ ] Do not auto-create next turns.
- [ ] Do not send or dispatch A2A messages.
- [ ] Do not start Agents from collaboration records.
- [ ] Do not execute Tool Runtime.
- [ ] Do not call MCP or external APIs.
- [ ] Do not run shell or Git.
- [ ] Do not write, patch, format, or delete files.
- [ ] Do not create PRs.
- [ ] Do not deploy.
- [ ] Do not auto-write approved Memory / Knowledge.
- [ ] Do not auto-complete Task.
- [ ] Do not enter Sprint 10.
