# Contract: WorkflowReadinessAssessment

Status: proposed for Sprint 14

## Purpose

WorkflowReadinessAssessment summarizes whether a WorkflowProposal is ready for human record approval. It is recommendation-only and cannot be consumed as execution permission.

## Fields

- `id: string`
- `correlationId: string`
- `workflowProposalId: string`
- `status: 'draft' | 'review' | 'approved_record' | 'rejected' | 'archived'`
- `riskFindings: string[]`
- `missingEvidence: string[]`
- `blockedReasons: string[]`
- `recommendation: 'needs_review' | 'request_changes' | 'approve_record' | 'reject_record'`
- `isExecutionToken: false`
- `createdBy: 'user' | 'agent_record' | 'system_seed'`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`

## Rules

- `recommendation = 'approve_record'` is not execution permission.
- `recommendation = 'needs_review'` means the human reviewer should continue reviewing manually. It must not be displayed as `Continue`, `Continue Agent`, or any execution-triggering label.
- `recommendation` values describe human review intent only. None of them trigger workflow execution, step execution, Agent continuation, ToolRun execution, or any runtime behavior.
- Readiness assessment must not auto-approve a workflow.
- Readiness assessment must not complete Tasks or continue runtime.
- `correlationId` must match the WorkflowProposal correlationId.
- `auditRefs` records which AuditEvent ids reference this assessment.
- WorkflowReadinessAssessment uses a safe lifecycle subset of the main workflow state machine: `draft`, `review`, `approved_record`, `rejected`, and `archived`.
- WorkflowReadinessAssessment must never introduce `proposal`, `superseded`, `running`, `executed`, `step_executed`, `continued`, `completed`, `retried`, `replayed`, `rolled_back`, `resumed`, `applied`, `called`, `connected`, or `deployed`.
