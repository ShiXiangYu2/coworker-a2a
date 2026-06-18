# Plan: Sprint 9 - Multi-Agent Collaboration / A2A Runtime

Status: proposed

## Implementation Order

1. Add Sprint 9 contracts for AgentTeam, CollaborationSession, A2AThread, A2ATurn, HandoffRequest, CollaborationDecision, state machine, and safety.
2. Extend Sprint 1-8 contracts with Sprint 9 local collaboration boundaries.
3. Add TypeScript types after specs review.
4. Add persistence after schema review.
5. Add local record APIs.
6. Add ChatHub / Task UI record views and safety notes.
7. Add EvalTarget mapping and recommendation-only eval checks.
8. Add Observability / Audit / RunJournal / RecoveryPoint / ResumeToken integration.
9. Add regression tests proving Sprint 9 does not dispatch, execute, loop, or mutate Task completion.

## Recommended Persistence

Sprint 9 should add new tables:

- `CollaborationSession`
- `A2AThread`
- `A2ATurn`
- `HandoffRequest`
- `CollaborationDecision`

`AgentTeam` may start as code configuration if team definitions are static. Add an `AgentTeam` table only if the UI needs editable or audited team definitions in Sprint 9.

Do not add:

- A2AWorker
- A2AQueue
- A2ASessionWorker
- AgentExecutionLoop
- AgentMessageDispatcher
- ExternalA2AConnection
- MessageBroker
- WebhookDelivery
- ToolExecutionFromA2A
- AutoContinuationJob

## API Groups

Agent Teams:

- `GET /api/agent-teams`
- `GET /api/agent-teams/:id`

Collaboration Sessions:

- `POST /api/collaboration-sessions/from-task`
- `POST /api/collaboration-sessions/from-a2a-message`
- `GET /api/collaboration-sessions`
- `GET /api/collaboration-sessions/:id`
- `POST /api/collaboration-sessions/:id/submit-review`
- `POST /api/collaboration-sessions/:id/open-record`
- `POST /api/collaboration-sessions/:id/pause`
- `POST /api/collaboration-sessions/:id/cancel`
- `POST /api/collaboration-sessions/:id/complete-record`

A2A Threads:

- `GET /api/collaboration-sessions/:id/threads`
- `POST /api/a2a/threads`
- `GET /api/a2a/threads/:id`
- `POST /api/a2a/threads/:id/archive`

A2A Turns:

- `GET /api/a2a/threads/:id/turns`
- `POST /api/a2a/turns`
- `GET /api/a2a/turns/:id`
- `POST /api/a2a/turns/:id/submit-review`
- `POST /api/a2a/turns/:id/approve-record`
- `POST /api/a2a/turns/:id/reject`
- `POST /api/a2a/turns/:id/archive`

Handoffs:

- `GET /api/handoffs`
- `POST /api/handoffs`
- `GET /api/handoffs/:id`
- `POST /api/handoffs/:id/submit-review`
- `POST /api/handoffs/:id/approve-record`
- `POST /api/handoffs/:id/reject`
- `POST /api/handoffs/:id/cancel`

Collaboration Decisions:

- `GET /api/collaboration-decisions`
- `POST /api/collaboration-decisions`
- `GET /api/collaboration-decisions/:id`
- `POST /api/collaboration-decisions/:id/submit-review`
- `POST /api/collaboration-decisions/:id/approve-record`
- `POST /api/collaboration-decisions/:id/reject`
- `POST /api/collaboration-decisions/:id/supersede`

Linked Queries:

- `GET /api/harmony/tasks/:id/collaboration-sessions`
- `GET /api/agent-runtime/runs/:id/collaboration-sessions`
- `GET /api/a2a/messages/:id/collaboration-sessions`
- `GET /api/eval-runs/:id/collaboration-sessions`

## Forbidden API Semantics

Do not add Sprint 9 API routes with execution semantics:

- `/send`
- `/dispatch`
- `/execute`
- `/run-tool`
- `/start-agent`
- `/start-a2a-loop`
- `/auto-continue`
- `/continue-loop`
- `/enqueue`
- `/deliver`
- `/call-external`
- `/complete-task`
- `/apply`
- `/deploy`

The check should be semantic. Existing record-query names such as `/api/agent-runtime/runs` or `/api/eval-runs` are not violations.

Allowed local-record verbs include:

- `from-task`
- `from-a2a-message`
- `submit-review`
- `open-record`
- `pause`
- `cancel`
- `complete-record`
- `approve-record`
- `reject`
- `archive`
- `supersede`

`open-record` is the required Sprint 9 name for opening a CollaborationSession local record. Do not use `activate` unless the implementation also adds explicit safety checks proving it does not start Agents, create turns, execute tools, or mutate Task status.

## UI Entry Points

ChatHub:

- show `Create Collaboration Session` from an approved local A2AMessage.
- show `View Collaboration Timeline`.
- show Sprint 9 safety note.

Task card/detail:

- `Collaborations`
- `A2A Threads`
- `Handoffs`
- `Decisions`
- `Audit`
- `Eval`
- `Recovery Points`
- `Resume View`

Cards:

- A2AMessage card links CollaborationSessions.
- AgentResult card can show `Create Collaboration Record` only when it creates a local record.
- Handoff card shows source Agent, target Agent, review state, and risk level.
- Decision card shows recommendation, risk level, Kelvin status, and audit link.

## Safety Gates

- `A2AMessage approved_record` must not automatically create CollaborationSession.
- CollaborationSession creation must not start AgentRun.
- `open-record` must not create AgentRun.
- `open-record` must not create A2ATurn.
- `open-record` must not create ToolCall or ToolRun.
- `open-record` must not mutate Task status.
- CollaborationSession plan source snapshots must be sanitized.
- A2ATurn creation must not produce or send A2AMessage.
- Handoff approval must not start target Agent.
- CollaborationDecision approval must not execute tools, write memory, dispatch A2A, or complete Task.
- Kelvin approval must only change local collaboration record status and must not trigger AgentRun, ToolCall, A2ATurn automatic creation, or Task completion.
- Sprint 9 code must not import or call Tool execution, shell, Git, file write, external API, MCP, queue, worker, deploy, or browser automation modules.
- Every mutation API must return `auditEvents` and/or `observabilityEvents`.
- Sprint 8 RecoveryPoint and ResumeToken integration must remain view-only.
- Sprint 7 Eval integration must remain recommendation-only.

## Validation Commands

When implemented:

```bash
npx prisma validate
npx prisma db push --skip-generate
npx prisma generate
npm run test
npm run lint
npm run build
```
