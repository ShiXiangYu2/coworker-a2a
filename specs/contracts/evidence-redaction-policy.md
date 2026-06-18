# Contract: EvidenceRedactionPolicy

Status: proposed for Sprint 17

## Purpose

EvidenceRedactionPolicy defines how user-provided evidence is rejected, redacted, summarized, and stored as local sanitized evidence. It is a local policy record only and cannot grant execution or external access.

## Fields

- `id: string`
- `policyVersion: string`
- `targetSprint: 'sprint_17'`
- `status: 'draft' | 'active' | 'archived'`
- `rejectSecrets: true`
- `redactTokens: true`
- `redactCookies: true`
- `redactCredentials: true`
- `redactPrivateKeys: true`
- `redactRawHeaders: true`
- `redactRawPayloads: true`
- `redactPersonalSensitiveData: true`
- `allowSummariesOnly: true`
- `storeRawInput: false`
- `allowRedactedExcerpt: true`
- `maxRedactedExcerptLength: number`
- `allowedSnapshotKinds: ('text_summary' | 'file_summary' | 'command_output_summary' | 'screenshot_description' | 'external_context_summary' | 'manual_note_summary')[]`
- `forbiddenPatterns: string[]`
- `requiredReviewForSensitiveFindings: true`
- `auditRequired: true`
- `evidenceOnly: true`
- `createdBy: 'operator' | 'system_seed'`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`

## Rules

- Raw input must not be stored by default.
- Secrets, tokens, cookies, credentials, private keys, raw headers, and raw payloads must be rejected or redacted.
- Redacted excerpts must be short and safe.
- EvidenceRedactionPolicy must not grant permission, execution, release, deploy, external access, or task completion.
- EvidenceRedactionPolicy must not call external redaction services unless a future sprint explicitly adds such capability.
