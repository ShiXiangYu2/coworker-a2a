# Acceptance Report: Sprint 14 — Human-Gated Workflow Orchestration Records

## Verdict

PASS.

## Scope Checked

Sprint 14 Workflow Orchestration Records — types, state machine, validators, Prisma schema, API routes, UI card, tests.

## Tests Run

- `npx tsc --noEmit` — ✅ zero errors
- `npx eslint src/lib/workflow/` — ✅ zero errors, zero warnings
- `npx vitest run src/lib/workflow` — ✅ 2 files, 62 tests, all pass
- `npx vitest run` (full suite) — ✅ 45 files, 237 tests, all pass

## Deliverables

### 1. Contract: workflow-orchestration-state-machine.md

- Allowed states: proposal / draft / review / approved_record / rejected / superseded / archived
- 12 allowed transitions defined
- 13 forbidden states listed (running, executed, completed, etc.)

### 2. TypeScript Types (`src/lib/workflow/types.ts`)

- `WorkflowProposal` — executionCapability='none', canExecute=false
- `WorkflowStepRecord` — executionCapability='none', canExecute=false, forbiddenExecutionReason
- `WorkflowDependencyGraph` — containsExecutableNode=false, per-node canExecute=false
- `WorkflowReviewRecord` — doesNotExecute=true
- `WorkflowReadinessAssessment` — isExecutionToken=false, recommendation='needs_review'|'request_changes'|'approve_record'|'reject_record'
- `WorkflowSourceEvidenceRef` — isExecutionToken=false (type-level safety)
- `FORBIDDEN_WORKFLOW_STATES` — 13 forbidden state names
- `FORBIDDEN_ACTION_TERMS` — 14 forbidden action terms
- `SPRINT_14_SAFETY_NOTE` — required safety note string

### 3. Validation Helpers (`src/lib/workflow/validators.ts`)

- Source evidence ref validation (type, isExecutionToken, redactionStatus)
- Forbidden state validation
- Forbidden action term validation (API routes, UI labels)
- Step dependency DAG validation (cycle detection, reference integrity)
- Graph integrity validation (no executable nodes, edge references)
- Safety field validators for all 5 models

### 4. State Machine (`src/lib/workflow/state-machine.ts`)

- `transitionWorkflow()` — workflow status transitions
- `transitionWorkflowReview()` — review record transitions
- `canTransitionWorkflow()` — safe transition check
- `assertNotForbidden()` — forbidden state guard
- Forbidden state guards on all transitions

### 5. Prisma Schema (5 new models)

- `WorkflowProposal` — idempotencyKey, correlationId, auditRefs, sourceEvidenceRefs
- `WorkflowStepRecord` — dependsOnStepIds, blockedByStepIds, forbiddenExecutionReason
- `WorkflowDependencyGraph` — nodesJson, edgesJson, containsExecutableNode=false
- `WorkflowReviewRecord` — doesNotExecute=true, confirmationArtifactId
- `WorkflowReadinessAssessment` — isExecutionToken=false, recommendation
- ✅ No WorkflowRun / WorkflowExecution / WorkflowStepExecution models

### 6. API Routes (22 route files)

**Proposal CRUD:**
- `GET/POST /api/workflow-proposals` — list + create
- `GET /api/workflow-proposals/:id` — single with steps/graph/assessments/reviews
- `POST /api/workflow-proposals/:id` — approve-record / reject / supersede / archive / submit-review

**From-* routes (read-and-snapshot only):**
- `POST /api/workflow-proposals/from-task`
- `POST /api/workflow-proposals/from-agent-run` — explicitly no Agent continuation
- `POST /api/workflow-proposals/from-tool-run` — explicitly no ToolRun execution
- `POST /api/workflow-proposals/from-tool-execution-receipt`
- `POST /api/workflow-proposals/from-file-change-proposal`
- `POST /api/workflow-proposals/from-pull-request-plan`
- `POST /api/workflow-proposals/from-external-action-proposal`
- `POST /api/workflow-proposals/from-user-snippet`

**Sub-resource routes:**
- `GET/POST /api/workflow-proposals/:id/steps`
- `GET/POST /api/workflow-step-records/:id` — approve / reject / archive / submit-review
- `GET/POST /api/workflow-proposals/:id/dependency-graph`
- `GET/POST /api/workflow-proposals/:id/readiness-assessments`
- `GET/POST /api/workflow-proposals/:id/reviews`

**Linked query routes (GET only):**
- `GET /api/harmony/tasks/:id/workflow-proposals`
- `GET /api/agent-runtime/runs/:id/workflow-proposals`
- `GET /api/tool-runs/:id/workflow-proposals`
- `GET /api/tool-execution-receipts/:id/workflow-proposals`
- `GET /api/file-change-proposals/:id/workflow-proposals`
- `GET /api/pull-request-plans/:id/workflow-proposals`
- `GET /api/external-action-proposals/:id/workflow-proposals`

### 7. UI Component (`src/components/chat/workflow-proposal-card.tsx`)

- Displays proposal status, steps, reviews, readiness assessments
- Action buttons: Add Step, Submit for Review, Approve Record, Reject, Archive
- No forbidden UI labels (Run Workflow, Execute Step, Continue Agent, etc.)
- Safety note displayed

### 8. Tests (62 tests across 2 files)

- State machine transitions (valid + invalid)
- Forbidden states (13 states rejected)
- Source evidence validation (type, isExecutionToken, redactionStatus)
- Forbidden action terms (API routes, UI labels)
- Step dependency validation (references, DAG)
- Graph integrity (executable nodes, edge references)
- Safety field validators (all 5 models)

## Safety Verification

| Check | Status |
|---|---|
| POST /from-* reads and snapshots only | ✅ |
| POST /from-tool-run does not execute ToolRun | ✅ |
| POST /from-agent-run does not continue Agent | ✅ |
| No WorkflowRun / Execution models | ✅ |
| No forbidden UI labels | ✅ |
| No execution states in state machine | ✅ |
| All safety fields enforced (canExecute/doesNotExecute/isExecutionToken) | ✅ |
| Sprint 1-13 behavior does not regress | ✅ (237 tests pass) |

## Residual Risks

- ChatHub page.tsx not yet wired to WorkflowProposalCard (low risk — card exists, integration is UI work)
- No linked query UI integration yet (low risk — API exists, UI is separate)
- Prisma schema not pushed to dev.db yet (requires `npx prisma db push`)
