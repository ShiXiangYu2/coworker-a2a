# Contract: EvidenceImportRecord

Status: proposed for Sprint 17

## Purpose

EvidenceImportRecord is a local, auditable record that captures a user-explicit evidence import request and its sanitized summary. It is not an execution token, release token, deploy token, external access token, or task completion token.

## Fields

- `id: string`
- `title: string`
- `summary: string`
- `targetSprint: 'sprint_17'`
- `baseline: 'sprint_1_15_sealed_mvp_plus_sprint_16_specs_ready'`
- `sourceProfileId: string`
- `sourceKind: 'user_pasted_text' | 'user_provided_file_summary' | 'user_provided_command_output_summary' | 'user_provided_external_screenshot_description' | 'user_provided_sanitized_context_snapshot' | 'manual_note'`
- `status: 'draft' | 'review' | 'approved_record' | 'rejected' | 'archived'`
- `userProvidedSummary: string`
- `rawInputHandling: 'not_stored' | 'stored_redacted_excerpt_only'`
- `importedContentSummary: string`
- `redactionPolicyId: string`
- `sanitizedSnapshotRefs: string[]`
- `sourceMetadata: EvidenceImportSourceMetadata`
- `sourceLimitations: string[]`
- `riskFindings: string[]`
- `openIssues: string[]`
- `evidenceOnly: true`
- `isExecutionToken: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isExternalAccessToken: false`
- `isTaskCompletionToken: false`
- `mutatesSourceRecords: false`
- `requiresKelvinConfirmation: true`
- `createdBy: 'user' | 'operator'`
- `reviewedBy?: 'kelvin' | 'owner' | 'operator'`
- `reviewedAt?: string`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`
- `archivedAt?: string`

## Source Metadata

```ts
type EvidenceImportSourceMetadata = {
  pathHint?: string
  commandHint?: string
  urlHint?: string
  endpointHint?: string
  mcpServerHint?: string
  externalSystemName?: string
  screenshotDescription?: string
  metadataOnly: true
  mayDereferencePath: false
  mayExecuteCommand: false
  mayFetchUrl: false
  mayCallEndpoint: false
  mayConnectMcp: false
}
```

## Rules

- `targetSprint` must be `sprint_17`.
- `baseline` must reference sealed Sprint 1-15 MVP plus Sprint 16 specs readiness.
- `status` must follow the evidence import state machine.
- EvidenceImportRecord may be created only from user-explicit content.
- Raw input is not stored by default.
- Source metadata must not be dereferenced.
- `approved_record` is a local review state only.
- EvidenceImportRecord must not mutate source records.
- EvidenceImportRecord must not read files, execute shell, execute Git, fetch URLs, call external APIs, connect MCP, execute AgentRun, execute ToolRun, execute workflow, create PR, deploy, publish, release, complete Task, retry, replay, rollback, restore, or resume execution.

## Sprint 19 Department Mapping Boundary

Sprint 19 may reference EvidenceImportRecord as sanitized evidence for EvidenceToDepartmentMappingRecord, DepartmentEvidenceCoverageRecord, DepartmentReviewGapRecord, and DepartmentMappingReviewRecord.

EvidenceImportRecord must remain evidence-only. It must not become an execution, routing, runtime permission, live import, release, deploy, external access, MCP access, or Task completion token.
