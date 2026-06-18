# Contract: EvidenceSourceProfile

Status: proposed for Sprint 17

## Purpose

EvidenceSourceProfile describes an allowed user-explicit evidence source type. It is a local source metadata record only. It cannot read, fetch, execute, connect, or import live data.

## Fields

- `id: string`
- `targetSprint: 'sprint_17'`
- `sourceKind: 'user_pasted_text' | 'user_provided_file_summary' | 'user_provided_command_output_summary' | 'user_provided_external_screenshot_description' | 'user_provided_sanitized_context_snapshot' | 'manual_note'`
- `displayName: string`
- `description: string`
- `collectionMode: 'manual_user_provided_only'`
- `allowedContentTypes: string[]`
- `forbiddenContentTypes: string[]`
- `metadataFields: ('pathHint' | 'commandHint' | 'urlHint' | 'endpointHint' | 'mcpServerHint' | 'externalSystemName' | 'screenshotDescription')[]`
- `mayDereferencePath: false`
- `mayReadDirectory: false`
- `mayReadClipboard: false`
- `mayExecuteCommand: false`
- `mayExecuteGit: false`
- `mayFetchUrl: false`
- `mayCallExternalApi: false`
- `mayConnectMcp: false`
- `mayReadExternalSystem: false`
- `mayWriteExternalSystem: false`
- `secretHandling: 'reject_or_redact'`
- `evidenceOnly: true`
- `createdBy: 'user' | 'operator' | 'system_seed'`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`

## Rules

- EvidenceSourceProfile allows only manually supplied content.
- Metadata fields are metadata only and must not be dereferenced.
- A profile must not grant permission to read files, execute commands, fetch URLs, call external APIs, connect MCP, read external systems, write external systems, execute AgentRun, execute ToolRun, or complete Task.
- Profiles can be displayed in Operator Console as source safety metadata only.
