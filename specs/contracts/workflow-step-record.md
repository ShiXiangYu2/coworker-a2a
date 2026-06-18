# Contract: WorkflowStepRecord

Status: proposed for Sprint 14

## Purpose

WorkflowStepRecord describes one local review step in a WorkflowProposal. It is a record of intended human review sequence only and cannot execute the referenced action.

## Fields

- `id: string`
- `correlationId: string`
- `workflowProposalId: string`
- `stepIndex: number`
- `title: string`
- `summary: string`
- `status: 'proposal' | 'draft' | 'review' | 'approved_record' | 'rejected' | 'superseded' | 'archived'`
- `stepKind: 'inspect_record' | 'review_record' | 'approve_record' | 'reject_record' | 'compare_evidence' | 'assess_risk' | 'document_decision'`
- `referencedRecordType: string`
- `referencedRecordId?: string`
- `sourceEvidenceRefs: WorkflowSourceEvidenceRef[]`
- `dependsOnStepIds: string[]`
- `blockedByStepIds: string[]`
- `executionCapability: 'none'`
- `canExecute: false`
- `forbiddenExecutionReason: string`
- `requiresKelvinConfirmation: boolean`
- `createdBy: 'user' | 'agent_record' | 'system_seed'`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`

## Rules

- WorkflowStepRecord is not an executable step.
- It must not call Agent, ToolRun, file, Git, external API, MCP, PR, deploy, webhook, worker, queue, retry, replay, rollback, or resume behavior.
- Approval only changes this local step record status.
- `approve_record` as a step kind describes human review intent to approve a referenced local record. It does not automatically approve the referenced record, does not execute the referenced record, and does not trigger any runtime behavior. The human must still explicitly call the referenced record's approve-record API separately.
- `reject_record` as a step kind describes human review intent to reject a referenced local record. It does not automatically reject the referenced record, does not execute the referenced record, and does not trigger any runtime behavior. The human must still explicitly call the referenced record's reject API separately.
- `correlationId` must match the WorkflowProposal correlationId.
- `auditRefs` records which AuditEvent ids reference this step record.
