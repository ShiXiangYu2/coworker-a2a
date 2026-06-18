# Implementation Plan

## Architecture Summary

Sprint 1 provides a vertical ChatHub slice:

ChatHub UI -> `/api/chat` -> LLM Provider -> Prisma SQLite persistence.

## Files/Modules

- `src/lib/llm/*`: provider types, mock provider, Claude provider, factory.
- `src/app/api/chat/route.ts`: streaming chat API and persistence.
- `src/app/api/conversations/*`: conversation list and message history.
- `src/app/page.tsx`: ChatHub shell, streaming client, history loading.
- `src/components/chat/*`: message list, message bubble, input.
- `.env.example`, `README.md`: setup and configuration docs.

## Task Order

1. Normalize LLM streaming events and API SSE contract.
2. Ensure assistant messages are persisted and return database IDs.
3. Add conversation history loading in ChatHub.
4. Update docs and configuration.
5. Run lint, tests, and build.

## Test Strategy

- `npm run lint`
- `npm run test`
- `npm run build`
- Run the dev server and exercise the mock flow in a browser if the build passes.

## Risks

Next.js 16 route typing and Prisma client generation may expose version-specific issues. Existing dirty changes are treated as related Sprint 1 work and preserved.
