# Contract: SanitizedEvidenceSnapshot

Status: proposed for Sprint 17

## Purpose

SanitizedEvidenceSnapshot is a local, redacted, evidence-only snapshot derived from a user-explicit EvidenceImportRecord. It stores summaries, normalized facts, limitations, and audit references without storing raw sensitive input by default.

## Fields

- `id: string`
- `importRecordId: string`
- `targetSprint: 'sprint_17'`
- `snapshotKind: 'text_summary' | 'file_summary' | 'command_output_summary' | 'screenshot_description' | 'external_context_summary' | 'manual_note_summary'`
- `sanitizedTitle: string`
- `sanitizedSummary: string`
- `redactedExcerpt?: string`
- `normalizedFacts: string[]`
- `sourceLimitations: string[]`
- `redactionStatus: 'sanitized' | 'redacted' | 'rejected_sensitive'`
- `rejectedSensitiveFindings: string[]`
- `confidence: 'low' | 'medium' | 'high'`
- `mayBeUsedBy: ('operator_console' | 'department_agent_profile' | 'workflow_proposal' | 'mvp_readiness' | 'future_human_gated_execution_review')[]`
- `evidenceOnly: true`
- `isExecutionToken: false`
- `isPermissionGrant: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `isExternalAccessToken: false`
- `isTaskCompletionToken: false`
- `createdBy: 'user' | 'operator' | 'system_record'`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`

## Rules

- Snapshot content must be derived from user-explicit evidence import only.
- Snapshot content must be sanitized or redacted.
- Raw secrets, tokens, cookies, credentials, private keys, raw headers, and raw payloads must not be stored.
- `redactedExcerpt` may contain only safe, shortened, redacted excerpts.
- SanitizedEvidenceSnapshot must not be used as execution, release, deploy, external access, permission, Kelvin confirmation, or task completion token.
- SanitizedEvidenceSnapshot must not trigger file read, command execution, URL fetch, external API call, MCP connection, AgentRun, ToolRun, workflow, PR, deploy, publish, release, retry, replay, rollback, restore, or resume execution.
## Sprint 18 Department Agent Profile Boundary

Sprint 18 DepartmentProfile, DepartmentAgentRole, DepartmentResponsibilityMatrix, DepartmentEscalationPolicy, DepartmentPermissionBoundary, and DepartmentReviewRecord records may reference this contract only as sanitized local evidence or read-only governance context.

Sprint 18 department records must not be consumed as execution, routing, runtime permission, release, deploy, external access, MCP access, PR creation, task completion, retry, replay, rollback, restore, resume, or future approval tokens.

Kelvin approval in Sprint 18 approves only one local department record. It must not execute Agent, continue Agent, execute ToolRun, execute workflow or step, write files, run Git, call external API, connect MCP, create PR, deploy, publish, release, complete Task, or approve future department behavior.


## Sprint 19 Department Mapping Boundary

Sprint 19 may reference SanitizedEvidenceSnapshot as the preferred sanitized evidence source for department evidence mappings.

SanitizedEvidenceSnapshot remains a local evidence reference only. It must not be dereferenced into live files, URLs, endpoints, MCP servers, external systems, Agent runtime, ToolRun runtime, workflow runtime, release, deploy, or Task completion.
