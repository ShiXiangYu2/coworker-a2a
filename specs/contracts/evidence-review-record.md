# Contract: EvidenceReviewRecord

Status: proposed for Sprint 17

## Purpose

EvidenceReviewRecord captures a human review decision for a local Sprint 17 evidence source, import, snapshot, or redaction policy record. It does not read, fetch, execute, connect, release, deploy, publish, or complete work.

## Fields

- `id: string`
- `targetType: 'evidence_source_profile' | 'evidence_import_record' | 'sanitized_evidence_snapshot' | 'evidence_redaction_policy'`
- `targetId: string`
- `targetSprint: 'sprint_17'`
- `status: 'draft' | 'review' | 'approved_record' | 'rejected' | 'archived'`
- `reviewer: 'kelvin' | 'owner' | 'operator'`
- `verdict: 'needs_changes' | 'approved_record' | 'rejected'`
- `reviewNotes: string`
- `confirmationArtifactId?: string`
- `evidenceOnly: true`
- `doesNotReadFiles: true`
- `doesNotRunCommands: true`
- `doesNotRunGit: true`
- `doesNotFetchUrls: true`
- `doesNotCallExternalSystems: true`
- `doesNotConnectMcp: true`
- `doesNotExecute: true`
- `doesNotRelease: true`
- `doesNotDeploy: true`
- `doesNotCompleteTask: true`
- `createdBy: 'user' | 'operator' | 'system_record'`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`
- `archivedAt?: string`

## Rules

- EvidenceReviewRecord can approve or reject only the referenced local evidence record.
- Approval changes local record state only.
- Approval must not trigger file read, directory read, clipboard read, shell, Git, URL fetch, external API, MCP, AgentRun, ToolRun, workflow, PR, deploy, publish, release, task completion, retry, replay, rollback, restore, or resume execution.
- `confirmationArtifactId` may point to a local Kelvin confirmation artifact, but the artifact remains evidence only.
