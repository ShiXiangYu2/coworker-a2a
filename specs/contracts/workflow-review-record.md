# Contract: WorkflowReviewRecord

Status: proposed for Sprint 14

## Purpose

WorkflowReviewRecord captures human review of a WorkflowProposal or WorkflowStepRecord. It can approve a local record status only.

## Fields

- `id: string`
- `correlationId: string`
- `workflowProposalId: string`
- `workflowStepRecordId?: string`
- `status: 'draft' | 'review' | 'approved_record' | 'rejected' | 'archived'`
- `reviewer: 'kelvin' | 'owner' | 'operator'`
- `verdict: 'needs_changes' | 'approved_record' | 'rejected'`
- `reviewNotes: string`
- `confirmationArtifactId?: string`
- `doesNotExecute: true`
- `createdBy: 'user' | 'agent_record' | 'system_seed'`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`

## Rules

- Review approval is not an execution token.
- Review approval must not run workflow, execute steps, continue Agents, execute ToolRuns, write files, run Git, call external APIs, connect MCP, create PRs, deploy, complete Tasks, retry, replay, rollback, or resume execution.
- Review records must be auditable and linked to correlationId / AuditEvent where available.
- `correlationId` must match the WorkflowProposal correlationId.
- `auditRefs` records which AuditEvent ids reference this review record.
- WorkflowReviewRecord uses a safe lifecycle subset of the main workflow state machine: `draft`, `review`, `approved_record`, `rejected`, and `archived`.
- WorkflowReviewRecord must never introduce `proposal`, `superseded`, `running`, `executed`, `step_executed`, `continued`, `completed`, `retried`, `replayed`, `rolled_back`, `resumed`, `applied`, `called`, `connected`, or `deployed`.
