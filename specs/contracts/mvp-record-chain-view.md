# Contract: MVPRecordChainView

Status: proposed for Sprint 16

## Purpose

MVPRecordChainView is a read-only derived view that presents the Sprint 1-15 MVP evidence chain. It helps operators understand how local records connect across ChatHub, Task, Agent, Tool, File / Git / PR, External / MCP, Workflow, MVP readiness, Audit, Observability, Eval, RegressionGate, and ReleaseReadiness.

It is a display view only and must not become a workflow runner, source record mutator, execution token, release token, or deploy token.

## Fields

- `id: string`
- `viewVersion: string`
- `targetSprint: 'sprint_16'`
- `baseline: 'sprint_1_15_complete_mvp_sealed'`
- `rootRecordRef?: MVPRecordChainRef`
- `nodes: MVPRecordChainNode[]`
- `edges: MVPRecordChainEdge[]`
- `coverage: MVPRecordChainCoverage`
- `warnings: string[]`
- `isReadOnly: true`
- `mutatesSourceRecords: false`
- `isExecutionToken: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isPublishToken: false`
- `isTaskCompletionToken: false`
- `createdFrom: 'linked_query_snapshot' | 'existing_local_records' | 'sanitized_context_snapshot'`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`

## Record Ref

```ts
type MVPRecordChainRef = {
  recordType:
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
    | 'mvp_readiness_record'
    | 'demo_scenario_record'
    | 'governance_summary_record'
    | 'mvp_review_record'
    | 'audit_event'
    | 'observability_event'
    | 'recovery_point'
    | 'eval_run'
    | 'regression_gate'
    | 'release_readiness_checklist'
    | 'user_snippet'
    | 'sanitized_context_snapshot'
  recordId?: string
  summary: string
  redactionStatus: 'sanitized' | 'redacted'
}
```

## Node

```ts
type MVPRecordChainNode = {
  id: string
  ref: MVPRecordChainRef
  label: string
  status?: string
  source: 'local_record' | 'sanitized_snapshot'
  evidenceOnly: true
  isExecutionToken: false
  isReleaseToken: false
  isDeployToken: false
  isPublishToken: false
  isTaskCompletionToken: false
  safetyNotes: string[]
  auditRefs: string[]
  createdAt?: string
  updatedAt?: string
}
```

## Edge

```ts
type MVPRecordChainEdge = {
  id: string
  fromNodeId: string
  toNodeId: string
  relation:
    | 'created_from'
    | 'linked_evidence'
    | 'reviewed_by'
    | 'summarized_by'
    | 'audited_by'
    | 'observed_by'
    | 'gated_by'
    | 'readiness_evidence'
  evidenceOnly: true
  triggersExecution: false
}
```

## Coverage

```ts
type MVPRecordChainCoverage = {
  chatHub: boolean
  harmonyTask: boolean
  agentRunAnalysisOnly: boolean
  controlledToolRuntime: boolean
  fileGitPrProposalOnly: boolean
  externalMcpGovernanceOnly: boolean
  workflowRecordOnly: boolean
  mvpReadiness: boolean
  auditObservability: boolean
  evalRegressionReleaseReadiness: boolean
}
```

## Rules

- MVPRecordChainView must be derived from existing local records or sanitized snapshots only.
- MVPRecordChainView must not dereference external systems.
- MVPRecordChainView must not call MCP.
- MVPRecordChainView must not mutate source records.
- Every node and edge must be evidence-only.
- Edges must not represent execution, scheduling, deployment, release, publishing, retry, replay, rollback, restore, or resume.
- Missing records may be displayed as warnings, not auto-created.

## Sprint 17 Evidence Display Boundary

MVPRecordChainView may include Sprint 17 evidence nodes:

- EvidenceSourceProfile.
- EvidenceImportRecord.
- SanitizedEvidenceSnapshot.
- EvidenceRedactionPolicy.
- EvidenceReviewRecord.

These nodes must remain sanitized evidence only.

MVPRecordChainView must not dereference path, command, URL, endpoint, or MCP metadata, and must not mutate source records or trigger runtime behavior.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.

