# Implementation Log: Sprint 14 — Human-Gated Workflow Orchestration Records

## Implementation Order

1. ✅ Contract: workflow-orchestration-state-machine.md (already existed)
2. ✅ TypeScript types (`src/lib/workflow/types.ts`)
3. ✅ Validation helpers (`src/lib/workflow/validators.ts`)
4. ✅ State machine (`src/lib/workflow/state-machine.ts`)
5. ✅ Prisma schema (5 new models)
6. ✅ API shared helpers (`src/app/api/workflow-proposals/_shared.ts`)
7. ✅ Proposal CRUD APIs (2 routes)
8. ✅ From-* APIs (8 routes)
9. ✅ Step APIs (2 routes)
10. ✅ Review / Readiness / Graph APIs (3 routes)
11. ✅ Linked query APIs (7 routes)
12. ✅ UI component (`src/components/chat/workflow-proposal-card.tsx`)
13. ✅ Tests (2 files, 62 tests)

## Files Created

### Spec
- `specs/contracts/workflow-orchestration-state-machine.md` (pre-existing)

### Types & Logic
- `src/lib/workflow/types.ts`
- `src/lib/workflow/state-machine.ts`
- `src/lib/workflow/validators.ts`
- `src/lib/workflow/index.ts`

### Prisma
- `prisma/schema.prisma` (extended with 5 models)

### API Routes
- `src/app/api/workflow-proposals/_shared.ts`
- `src/app/api/workflow-proposals/route.ts`
- `src/app/api/workflow-proposals/[id]/route.ts`
- `src/app/api/workflow-proposals/[id]/steps/route.ts`
- `src/app/api/workflow-proposals/[id]/reviews/route.ts`
- `src/app/api/workflow-proposals/[id]/readiness-assessments/route.ts`
- `src/app/api/workflow-proposals/[id]/dependency-graph/route.ts`
- `src/app/api/workflow-proposals/from-task/route.ts`
- `src/app/api/workflow-proposals/from-agent-run/route.ts`
- `src/app/api/workflow-proposals/from-tool-run/route.ts`
- `src/app/api/workflow-proposals/from-tool-execution-receipt/route.ts`
- `src/app/api/workflow-proposals/from-file-change-proposal/route.ts`
- `src/app/api/workflow-proposals/from-pull-request-plan/route.ts`
- `src/app/api/workflow-proposals/from-external-action-proposal/route.ts`
- `src/app/api/workflow-proposals/from-user-snippet/route.ts`
- `src/app/api/workflow-step-records/[id]/route.ts`
- `src/app/api/harmony/tasks/[id]/workflow-proposals/route.ts`
- `src/app/api/agent-runtime/runs/[id]/workflow-proposals/route.ts`
- `src/app/api/tool-runs/[id]/workflow-proposals/route.ts`
- `src/app/api/tool-execution-receipts/[id]/workflow-proposals/route.ts`
- `src/app/api/file-change-proposals/[id]/workflow-proposals/route.ts`
- `src/app/api/pull-request-plans/[id]/workflow-proposals/route.ts`
- `src/app/api/external-action-proposals/[id]/workflow-proposals/route.ts`

### UI
- `src/components/chat/workflow-proposal-card.tsx`

### Tests
- `src/lib/workflow/__tests__/state-machine.test.ts`
- `src/lib/workflow/__tests__/validators.test.ts`

## Bugs Fixed During Implementation

1. Prisma one-to-one relation requires @unique on WorkflowDependencyGraph.workflowProposalId
2. HarmonyTask model lacks `riskLevel` field — removed from from-task route select
3. Linked query routes used relative imports — fixed to `@/app/api/workflow-proposals/_shared`
4. workflow-step-records route used non-existent `entityType` field on HarmonyAuditEvent — moved to payloadJson
5. Unused imports in validators.ts and test files — removed

## What Was NOT Implemented (by design)

- Workflow state machine contract file was already present (workflow-orchestration-state-machine.md)
- No WorkflowRun / WorkflowExecution / WorkflowStepExecution models
- No /run / /execute / /continue-agent / /run-tool API routes
- No file write / Git / shell / external API / MCP integration
- No Agent continuation / ToolRun execution
- No Task completion automation
