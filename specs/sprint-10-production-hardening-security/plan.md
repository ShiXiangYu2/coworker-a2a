# Plan: Sprint 10 - Production Hardening / Security / Deployment Readiness

Status: proposed

## Implementation Order

1. Add Sprint 10 production hardening and security contracts.
2. Extend existing Sprint 1-9 contracts with Sprint 10 production boundary sections.
3. Add TypeScript types after specs review.
4. Implement static config or seed config for first-version policy/profile/readiness records.
5. Add read-oriented APIs for security policy, agent profiles, release readiness, and regression gates after API review.
6. Add ChatHub / Task UI safety and readiness views.
7. Add regression tests proving Sprint 10 does not introduce execution semantics.
8. Add release readiness checks proving Sprint 1-9 behavior still works.

## Recommended Persistence

Sprint 10 first implementation should prefer static config or seed config plus read-only display.

Sprint 10 may later add tables only after a separate schema review for:

- `SecurityPolicy`
- `AgentProfile`
- `AgentPermissionBoundary`
- `SkillIOContract`
- `ReleaseReadinessChecklist`
- `RegressionGate`
- `ApiAuthBoundary`

`SecretRedactionPolicy` and `ProductionObservabilityPolicy` may start as versioned config records if that matches the implementation style.

Sprint 10 must not add persistence for Sprint 11 or Sprint 12 resources.

Do not add:

- ToolExecutor
- ToolExecutionPlan
- ToolExecutionReceipt
- ToolExecutionWorker
- AgentExecutionWorker
- SecurityAutoFixRun
- PolicyBypassToken
- DeployJob
- ExternalSecurityScanner
- SecretSyncJob
- GitOperation
- FilePatch
- PullRequestRun
- McpSession
- ExternalApiCall
- QueueJob
- AutoRemediationRun
- Worker
- Queue

## API Groups

First implementation may treat SecurityPolicy, AgentProfile, AgentPermissionBoundary, and SkillIOContract as static configuration plus read-only display.

If local review APIs are implemented for these records, those APIs must create or update local review records only. They must not activate execution, deploy, start Agents, execute Tools, write files, use Git, call external APIs, call MCP, or bypass Kelvin.

Security policies:

- `GET /api/security/policies`
- `GET /api/security/policies/:id`
- `GET /api/security/effective-policy`

Agent profiles:

- `GET /api/agent-profiles`
- `GET /api/agent-profiles/:id`
- `GET /api/agent-profiles/:id/permission-boundary`

Skill I/O contracts:

- `GET /api/skill-io-contracts`
- `GET /api/skill-io-contracts/:id`

Release readiness:

- `GET /api/release-readiness`
- `GET /api/release-readiness/:id`
- `POST /api/release-readiness/:id/submit-review`
- `POST /api/release-readiness/:id/approve-record`
- `POST /api/release-readiness/:id/reject`

Regression gates:

- `GET /api/regression-gates`
- `GET /api/regression-gates/:id`
- `GET /api/regression-gates/:id/checks`

Auth boundary:

- `GET /api/auth-boundary`
- `GET /api/auth-boundary/roles`

Production observability:

- `GET /api/production-observability/policy`
- `GET /api/production-observability/readiness`

All Sprint 10 mutation APIs are local record review mutations only and must return `auditEvents` and/or `observabilityEvents`.

`release-readiness` and `regression-gate` API results are display and review evidence only. No execution path may consume them as execution permits, deployment permits, or automatic precondition tokens.

Sprint 10 API auth is first-version role attribution, route guard, and UI visibility only. It is not complete multi-tenancy, organization membership, or tenant isolation. `owner`, `operator`, `viewer`, and `agent_record` roles must not grant execution capability by themselves.

## Forbidden API Semantics

Do not add Sprint 10 API routes with execution semantics:

- `/execute`
- `/run-tool`
- `/start-agent`
- `/apply`
- `/create-pr`
- `/deploy`
- `/dispatch`
- `/auto-fix`
- `/resume-execution`
- `/bypass-permission`
- `/send-external-request`
- `/call-external`
- `/mcp`
- `/shell`
- `/git`
- `/write-file`
- `/delete`

The check should be semantic. Existing record-query names from earlier sprints, such as `/api/agent-runtime/runs`, `/api/tool-runs/:id`, and `/api/eval-runs`, are not violations when they remain record queries.

Allowed local-record verbs include:

- `submit-review`
- `approve-record`
- `reject`
- `archive`
- `supersede`
- `view`
- `summary`
- `checks`

## UI Entry Points

ChatHub:

- `View Security Boundary`
- `View Agent Profile`
- `View Production Checklist`
- display Sprint 10 safety note.

Task card/detail:

- `Security`
- `Release Readiness`
- `Regression Gate`
- `Audit Policy`
- `Redaction Policy`

Agent cards:

- `View Agent Profile`
- `View Permission Boundary`
- `View Skill Contracts`

ToolCall / Eval / Collaboration cards:

- `View Permission Boundary`
- `View Regression Coverage`
- `View Audit Policy`

## Safety Gates

- Claude CEO cannot execute, dispatch, apply, deploy, call external APIs, or bypass Kelvin.
- SecurityPolicy default decision must be `deny`.
- AgentPermissionBoundary must explicitly mark execution capabilities as false for Sprint 10.
- SkillIOContract `allowedSideEffects` must be `none` in Sprint 10.
- ApiAuthBoundary must distinguish human users from agent record actors.
- Secrets and blocked payloads must not persist into any snapshot, evidence, prompt, audit payload, or resume context.
- ReleaseReadinessChecklist approval must not deploy.
- ReleaseReadinessChecklist approval must not become an execution token.
- RegressionGate pass / fail / blocked must not mutate target Sprint records.
- RegressionGate passed must not become an execution token.
- Kelvin approval must only change the reviewed local record state.
- Sprint 10 code must not import or call Tool execution, shell, Git, file write, external API, MCP, queue, worker, deploy, browser automation, or auto-fix modules.

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

## Review Questions

- Are production security records sufficiently explicit to implement later?
- Does any field imply real execution?
- Does any API path imply execution?
- Are Sprint 1-9 regressions covered by RegressionGate?
- Is Claude CEO constrained enough for production readiness?
- Are blocked redaction payload rules applied to every record surface?
- Does the plan avoid active Sprint 11 Tool Runtime requirements?
- Does the plan avoid active Sprint 12 File / Git / PR requirements?
