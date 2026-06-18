# Plan: Sprint 2 - CEO Agent Router

Status: implemented; final acceptance review in progress.

## Architecture Decision

Sprint 2 is limited to this slice:

```text
User Message -> CEO Router -> RouteDecision -> ChatHub preview
```

It intentionally does not enter this later flow:

```text
RouteDecision -> Task -> TaskRun -> Agent Runtime -> Tools -> Artifacts
```

## Module Map

| Module | Responsibility | File |
| --- | --- | --- |
| Agent types | Shared type contract for agents and route decisions | `src/lib/agents/types.ts` |
| Agent registry | Static company member registry | `src/lib/agents/registry.ts` |
| CEO router | Rule-based intent router | `src/lib/agents/router.ts` |
| Future CEO prompt | Prompt placeholder for a future LLM router | `src/lib/agents/prompts/ceo.ts` |
| Agents API | Returns enabled agent profiles | `src/app/api/agents/route.ts` |
| Router handler | Shared POST validation and routing handler | `src/app/api/agent-router/handler.ts` |
| Router API | Compatibility route | `src/app/api/agent-router/route.ts` |
| Router API canonical route | Spec route | `src/app/api/agent-router/route/route.ts` |
| Router UI | Route decision preview card | `src/components/chat/route-decision-card.tsx` |
| ChatHub | Calls router without blocking SSE chat | `src/app/page.tsx` |

## Contract Choices

`AgentProfile` includes implementation fields and future extension fields:

- Implemented now: `id`, `name`, `title`, `role`, `description`, `responsibilities`, `capabilities`, `skillRefs`, `defaultDecisionTypes`, `isHuman`, `isEnabled`.
- Reserved for later interpretation: `skillRefs`, `defaultDecisionTypes`.

`RouteDecision` includes:

- `status`: `ready`, `blocked`, or `unsupported`.
- `decisionType`: current route class.
- `targetAgentId`: optional target.
- `confidence`: rule confidence from 0 to 1.
- `reason`: user-facing explanation.
- `matchedSignals`: rule matches.
- `suggestedTaskTitle`: preview title only; no task is created.
- `requiresHumanConfirmation`: explicit confirmation boundary.
- `next`: recommended UI action only.
- `sideEffects`: always empty in Sprint 2.

## Endpoint Policy

`POST /api/agent-router/route` is the canonical spec endpoint.

`POST /api/agent-router` is retained as a compatibility endpoint. Both call the same shared handler, so validation and response shape stay identical.

## ChatHub Integration

ChatHub calls the router and `/api/chat` separately. The router request is intentionally non-blocking:

- If router succeeds, ChatHub displays a preview card.
- If router fails, ChatHub displays an unavailable decision and continues normal chat.
- `/api/chat` remains responsible for SSE streaming.

## Testing Strategy

Unit and handler tests cover:

- Registry contains six company members.
- English and Chinese product routing.
- Engineering, verification, customer, and CEO routing.
- Chat-only routing.
- Human confirmation for high-risk English and Chinese actions.
- Unsupported integrations.
- Empty Sprint 2 side effects.
- Router handler validation for valid messages, empty messages, non-string `conversationId`, and invalid JSON.

Regression commands:

```bash
npm run lint
npm run test
npm run build
```

## Acceptance Gate

Sprint 2 can be marked complete only if:

- The above commands pass.
- No Prisma schema change is present.
- No Task, Memory, Tool Runtime, or Agent Runtime implementation is introduced.
- ChatHub still streams normal chat responses through `/api/chat`.
- Router UI clearly says it is preview only.
