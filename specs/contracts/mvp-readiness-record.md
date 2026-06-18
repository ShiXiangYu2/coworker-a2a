# Contract: MVPReadinessRecord

Status: proposed for Sprint 15

## Purpose

MVPReadinessRecord is a local, auditable record that packages Sprint 1-14 evidence into an MVP closure readiness summary. It is not an execution token, release token, deploy token, publish token, or task completion token.

## Fields

- `id: string`
- `title: string`
- `summary: string`
- `targetVersion: string`
- `targetSprint: 'sprint_15'`
- `baselineSprints: Array<'sprint_1' | 'sprint_2' | 'sprint_3' | 'sprint_4' | 'sprint_5' | 'sprint_6' | 'sprint_7' | 'sprint_8' | 'sprint_9' | 'sprint_10' | 'sprint_11' | 'sprint_12' | 'sprint_13' | 'sprint_14'>`
- `status: 'draft' | 'review' | 'approved_record' | 'rejected' | 'archived'`
- `readinessScope: 'mvp_demo' | 'system_review' | 'governance_handoff' | 'stage_closure'`
- `evidenceRefs: MVPSourceEvidenceRef[]`
- `demoScenarioRefs: string[]`
- `governanceSummaryRefs: string[]`
- `regressionGateRefs: string[]`
- `releaseReadinessRefs: string[]`
- `riskFindings: string[]`
- `openIssues: string[]`
- `acceptanceMatrix: MVPAcceptanceCriterion[]`
- `recommendation: 'needs_review' | 'approve_record' | 'reject_record'`
- `isExecutionToken: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `requiresKelvinConfirmation: true`
- `createdBy: 'user' | 'operator' | 'agent_record' | 'system_seed'`
- `reviewedBy?: 'kelvin' | 'owner' | 'operator'`
- `reviewedAt?: string`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`
- `archivedAt?: string`

## Source Evidence Ref

```ts
type MVPSourceEvidenceRef = {
  sourceType:
    | 'task'
    | 'agent_run'
    | 'agent_result'
    | 'tool_call'
    | 'tool_run'
    | 'tool_result'
    | 'tool_execution_receipt'
    | 'file_change_proposal'
    | 'patch_draft'
    | 'git_change_plan'
    | 'pull_request_plan'
    | 'review_patch_record'
    | 'external_action_proposal'
    | 'integration_risk_assessment'
    | 'external_action_review_record'
    | 'workflow_proposal'
    | 'workflow_step_record'
    | 'workflow_dependency_graph'
    | 'workflow_readiness_assessment'
    | 'workflow_review_record'
    | 'audit_event'
    | 'observability_event'
    | 'recovery_point'
    | 'eval_run'
    | 'regression_gate'
    | 'release_readiness_checklist'
    | 'user_snippet'
    | 'sanitized_context_snapshot'
  sourceId?: string
  summary: string
  redactionStatus: 'sanitized' | 'redacted'
  isExecutionToken: false
  isReleaseToken: false
  isDeployToken: false
}
```

## Acceptance Criterion

```ts
type MVPAcceptanceCriterion = {
  id: string
  title: string
  status: 'met' | 'needs_review' | 'blocked'
  evidenceRefs: string[]
  notes?: string
}
```

## Rules

- `targetSprint` must be `sprint_15`.
- `baselineSprints` must cover Sprint 1-14.
- `status` must follow the MVP readiness state machine.
- `approved_record` is a local review state only.
- `recommendation` is not execution, release, deploy, publish, or task completion permission.
- `evidenceRefs` must contain sanitized or redacted evidence only.
- MVPReadinessRecord must not mutate source evidence records.
- MVPReadinessRecord must not execute AgentRun, ToolRun, workflow, file, Git, external, MCP, PR, deploy, release, publish, retry, replay, rollback, or resume behavior.

## Sprint 16 Display Boundary

Sprint 16 MVPOperatorConsole, MVPRecordChainView, and MVPSafetyMatrixView may display MVPReadinessRecord as sanitized evidence only.

- Displaying MVPReadinessRecord must not mutate it.
- `approved_record`, `recommendation`, and readiness status remain local review evidence only.
- MVPReadinessRecord must not become an execution, release, deploy, publish, or task completion token in Sprint 16 console views.
