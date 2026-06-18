# Tasks: Sprint 2 - CEO Agent Router

Status: implementation complete; acceptance verification required.

## Completed

- [x] Define agent and router type contracts in `src/lib/agents/types.ts`.
- [x] Define static Agent Registry in `src/lib/agents/registry.ts`.
- [x] Define Kelvin, Elon, Jobs, Linus, Turing, and Bezos.
- [x] Preserve `skillRefs` as future-facing references without executing skills.
- [x] Add future CEO prompt placeholder in `src/lib/agents/prompts/ceo.ts`.
- [x] Implement rule-based CEO Router in `src/lib/agents/router.ts`.
- [x] Add English and Chinese routing signals.
- [x] Add default-deny human confirmation boundary for high-risk actions.
- [x] Return structured `RouteDecision` with `status`, `confidence`, `next`, and empty `sideEffects`.
- [x] Add `GET /api/agents`.
- [x] Add canonical `POST /api/agent-router/route`.
- [x] Add compatibility `POST /api/agent-router`.
- [x] Share one handler for both router endpoints.
- [x] Integrate RouteDecision preview into ChatHub.
- [x] Keep router failure non-blocking for `/api/chat` SSE.
- [x] Add registry, router, and handler tests.

## Acceptance Checklist

- [ ] `GET /api/agents` returns all six company members.
- [ ] Product/PRD messages route to Jobs.
- [ ] Engineering/API/database messages route to Linus.
- [ ] Test/eval/review messages route to Turing.
- [ ] Customer/market/feedback messages route to Bezos.
- [ ] Roadmap/multi-agent planning messages route to Elon.
- [ ] Lightweight explanation remains `chat_only`.
- [ ] High-risk actions return `needs_human_confirmation`, `status: blocked`, and Kelvin.
- [ ] Unsupported integrations return `unsupported`.
- [ ] ChatHub card clearly says Sprint 2 does not create tasks, execute agents, or call tools.
- [ ] Router failure does not block normal chat.
- [ ] No Prisma schema change.
- [ ] No Task, Tool Runtime, Memory, or Agent Runtime implementation.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.

## Non-goals Guardrail

Do not implement the following in Sprint 2:

- Harmony / Task Engine.
- Real Task creation.
- Specialist Agent execution.
- Agent-to-Agent runtime.
- Memory / Obsidian integration.
- Tool Runtime or external tool execution.
- Database schema changes.
- Production observability or recovery systems.
