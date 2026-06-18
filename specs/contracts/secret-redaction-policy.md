# Contract: SecretRedactionPolicy

Status: proposed for Sprint 10

## Purpose

SecretRedactionPolicy strengthens Sprint 8 RedactionPolicy for production readiness.

It defines secrets and sensitive payloads that must be redacted or blocked before any data is persisted, shown in UI, included in Agent prompt context, used as Eval evidence, or stored in recovery / resume records.

## Schema

```ts
SecretRedactionPolicy {
  id: string
  redactionVersion: string
  status: 'draft' | 'active' | 'archived'

  secretClasses: (
    | 'api_key'
    | 'access_token'
    | 'refresh_token'
    | 'password'
    | 'private_key'
    | 'cookie'
    | 'session_token'
    | 'env_dump'
    | 'raw_file_content'
    | 'raw_shell_output'
    | 'raw_external_payload'
    | 'personal_data'
  )[]

  redactedFields?: string[]
  blockedFields?: string[]
  blockedPatterns?: string[]

  blockedPayloadDestinations: (
    | 'audit_event_payload'
    | 'observability_event_payload'
    | 'recovery_point_snapshot'
    | 'run_journal_entry'
    | 'resume_token_context'
    | 'eval_evidence'
    | 'agent_prompt'
    | 'tool_call_policy_snapshot'
    | 'collaboration_plan_snapshot'
    | 'memory_candidate'
    | 'knowledge_item'
  )[]

  maxAllowedExcerptChars: number
  allowHashes: boolean
  allowCounts: boolean
  allowSummaries: boolean

  createdAt: string
  updatedAt: string
}
```

## Production Rule

Blocked payloads must not enter:

- AuditEvent payload.
- ObservabilityEvent payload.
- RecoveryPoint snapshot.
- RunJournal entry.
- ResumeToken context.
- Eval evidence.
- Agent prompt.
- ToolCall policy snapshot.
- Collaboration plan source snapshot.
- MemoryEntry candidate.
- KnowledgeItem content.

## Allowed Sanitized Representations

Allowed:

- compact summaries.
- validation errors without raw secret values.
- resource IDs.
- before / after statuses.
- counts.
- normalized hashes.
- redacted field names.
- risk labels.

Not allowed:

- raw `.env` content.
- raw shell stdout / stderr.
- full file contents.
- private keys.
- bearer tokens.
- cookies.
- raw external request / response bodies.
- full user private data.

## Safety Invariants

- Redaction must happen before persistence.
- `blocked` means do not persist the payload.
- A blocked payload may produce a sanitized failure record.
- UI must never display blocked payloads.
- Agent prompts must never receive blocked payloads.
