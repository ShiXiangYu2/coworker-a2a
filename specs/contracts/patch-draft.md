# Contract: PatchDraft

Status: proposed for Sprint 12

## Purpose

PatchDraft stores a suggested patch or diff as review evidence.

It is a persisted local draft only. It must not be applied to the workspace.

## Schema

```ts
PatchDraft {
  id: string
  schemaVersion: string
  correlationId: string
  fileChangeProposalId: string

  status:
    | 'proposal'
    | 'draft'
    | 'review'
    | 'approved_record'
    | 'rejected'
    | 'superseded'
    | 'archived'

  draftType: 'unified_diff_proposal' | 'text_replacement_proposal' | 'new_file_proposal' | 'delete_file_proposal' | 'rename_file_proposal'
  targetPath: string
  targetPathKind: 'metadata_only'
  language?: string

  summary: string
  rationale: string
  proposedPatch: string
  patchHash: string

  sourceSnippet?: string
  sourceSnippetHash?: string
  sourceRedactionStatus: 'not_required' | 'redacted' | 'blocked'
  redactedFields?: string[]

  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requiresHumanConfirmation: boolean
  confirmationArtifactId?: string

  canApply: false
  canWriteFile: false
  canFormat: false

  createdBy: 'human' | 'system' | 'agent_record'
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}
```

## Patch Content Rules

- `proposedPatch` is a proposal string only.
- `targetPath` is metadata and must not be opened or written by Sprint 12.
- `sourceSnippet` may be stored only when user-provided or sanitized.
- Full file contents should not be stored unless the user explicitly provided the complete content for review and redaction allows it.
- Blocked payloads must not be persisted.

## Safety Invariants

- PatchDraft cannot be applied.
- PatchDraft cannot write files.
- PatchDraft cannot run formatters.
- PatchDraft cannot create commits or PRs.
- PatchDraft approval means the draft is locally approved as a record only.

