# Requirements Baseline

## Goal

Implement the Sprint 1 ChatHub MVP for CoWorker+A2A.

## Non-goals

No multi-agent routing, Harmony task engine, Obsidian integration, external tools, authentication, or production monitoring in this sprint.

## User-visible Behavior

Users can open ChatHub, send a message, receive a streaming mock response, start a new conversation, and reload the page while keeping conversation history.

## Acceptance Criteria

- `localhost:3000` shows ChatHub.
- `LLM_PROVIDER=mock` works without an Anthropic API key.
- Sending a message streams an assistant response.
- Refreshing the page restores the latest conversation.
- New conversation clears the current message list.
- `.env.example` documents `DATABASE_URL`, `LLM_PROVIDER`, `ANTHROPIC_API_KEY`, and `SYSTEM_PROMPT`.
- Lint, tests, and build are run or documented.

## Constraints

Keep the MVP small and follow the existing Next.js + Prisma project structure.

## Assumptions

SQLite is sufficient for Sprint 1. The app is single-user. Mock mode is the default local development path.

## Open Questions

None blocking.

## Source Request

The user approved implementing `coworker-a2a` Sprint 1 ChatHub MVP from the existing PRD, plan, and tasks.

## Repo Context

The repository already had a Next.js app, Prisma schema, initial API/LLM/component files, and dirty worktree changes related to this Sprint.
