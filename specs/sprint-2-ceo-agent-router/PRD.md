# PRD: Sprint 2 - CEO Agent Router

Created: 2026-06-15
Status: implemented and under acceptance review

## Problem

Sprint 1 delivered the ChatHub MVP: a web chat surface, SSE streaming replies, conversation persistence, and mock/Claude provider support. The system still needed the first organizational layer of an Agent company: deciding whether a user message should remain normal chat or be routed to a company role.

Sprint 2 introduces a minimal CEO Agent Router. It classifies user intent and returns a structured route decision. It does not create tasks, execute agents, call tools, write memory, or change the database schema.

## Scope

Implemented scope:

- Static Agent Registry for Kelvin, Elon, Jobs, Linus, Turing, and Bezos.
- Rule-based CEO Router with English and Chinese intent signals.
- Structured `RouteDecision` with `status`, `decisionType`, `targetAgentId`, `confidence`, `reason`, `matchedSignals`, `next`, and empty `sideEffects`.
- `GET /api/agents`.
- `POST /api/agent-router/route`.
- Compatibility endpoint: `POST /api/agent-router`.
- ChatHub route decision card.
- Router failure does not block `/api/chat` SSE streaming.

## Agent Company

| Agent | Role | Sprint 2 responsibility |
| --- | --- | --- |
| Kelvin | Human Chairman | Owns final approval and high-risk decisions. |
| Elon | CEO Agent | Routes intent and coordinates future specialist agents. |
| Jobs | Product Agent | Handles requirements, PRDs, UX, prototypes, and acceptance criteria. |
| Linus | Engineering Agent | Handles architecture, APIs, databases, implementation, and refactoring. |
| Turing | Verification Agent | Handles tests, evals, reviews, diagnosis, and quality gates. |
| Bezos | Customer Agent | Handles customer feedback, market signals, business value, and growth. |

## Route Decision Contract

The router response must be structured JSON:

```json
{
  "status": "ready",
  "decisionType": "delegate_to_agent",
  "targetAgentId": "jobs",
  "confidence": 0.86,
  "reason": "The message is primarily about product requirements or user experience.",
  "matchedSignals": ["prd"],
  "suggestedTaskTitle": "Shape product requirements",
  "requiresHumanConfirmation": false,
  "next": {
    "recommendedAction": "show_route_suggestion",
    "reason": "The message is primarily about product requirements or user experience."
  },
  "sideEffects": {
    "filesChanged": [],
    "branchesCreated": [],
    "prsCreated": [],
    "issuesUpdated": []
  }
}
```

`status` values:

- `ready`: the decision can be shown as a suggestion.
- `blocked`: human confirmation is required before future execution.
- `unsupported`: the request is outside Sprint 2 capability.

`decisionType` values:

- `chat_only`
- `create_task` - reserved; Sprint 2 does not create tasks.
- `delegate_to_agent`
- `needs_human_confirmation`
- `unsupported`

## Routing Rules

| Intent | Decision |
| --- | --- |
| Product, requirements, PRD, UX, prototype, acceptance criteria | `delegate_to_agent` -> Jobs |
| Code, architecture, API, database, implementation, refactor | `delegate_to_agent` -> Linus |
| Test, eval, acceptance, bug, review, quality, regression | `delegate_to_agent` -> Turing |
| Customer, feedback, market, competitor, business, growth | `delegate_to_agent` -> Bezos |
| Roadmap, decomposition, multi-agent coordination, system plan | `delegate_to_agent` -> Elon |
| Lightweight explanation or casual chat | `chat_only` |
| Delete, deploy, publish, push, merge, permissions, secrets, production, migration | `needs_human_confirmation` -> Kelvin |
| External integrations not available in Sprint 2 | `unsupported` |

## Human Confirmation Boundary

Sprint 2 follows a default-deny posture for high-risk requests. The router blocks and routes to Kelvin when a message may cause irreversible or external impact, including:

- File or branch deletion.
- Publish, deploy, release, push, merge, or pull request creation.
- Sending email or messages.
- Payment or purchase.
- Permission, secret, environment, production, or database migration changes.

Sprint 2 only displays the confirmation requirement. It does not execute the action.

## Non-goals

- No Harmony / Task Engine.
- No real Task creation.
- No Specialist Agent execution.
- No Agent-to-Agent runtime.
- No Memory / Obsidian integration.
- No Tool Runtime.
- No filesystem, shell, GitHub, Feishu, Gmail, or external API execution.
- No database schema change.
- No production observability dashboard.

## Acceptance Criteria

- `GET /api/agents` returns the six initial company members.
- `POST /api/agent-router/route` routes PRD/product messages to Jobs.
- It routes architecture/API/database messages to Linus.
- It routes test/eval/review messages to Turing.
- It routes customer/market/feedback messages to Bezos.
- It routes complex roadmap or multi-agent planning messages to Elon.
- It returns `chat_only` for lightweight explanation or casual chat.
- It returns `needs_human_confirmation` and `status: blocked` for high-risk actions.
- It returns `unsupported` and `status: unsupported` for unavailable integrations.
- Every decision includes `confidence`, `reason`, `next`, and empty `sideEffects`.
- ChatHub displays the decision as a preview only.
- Router failure does not block normal chat streaming.
- `npm run lint`, `npm run test`, and `npm run build` pass.
