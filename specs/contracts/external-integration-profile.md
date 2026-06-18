# Contract: ExternalIntegrationProfile

Status: proposed for Sprint 13

## Purpose

ExternalIntegrationProfile records sanitized metadata about a possible external integration.

It is a local governance profile only. It must not call external APIs, create credentials, create webhooks, start workers, or connect to external systems.

## Schema

```ts
ExternalIntegrationProfile {
  id: string
  schemaVersion: string
  correlationId: string

  name: string
  providerType:
    | 'generic_http'
    | 'github'
    | 'gitlab'
    | 'slack'
    | 'lark'
    | 'email'
    | 'webhook'
    | 'mcp'
    | 'other'

  status:
    | 'proposal'
    | 'draft'
    | 'review'
    | 'approved_record'
    | 'rejected'
    | 'superseded'
    | 'archived'

  endpointMetadata?: {
    displayHost?: string
    displayPath?: string
    protocol?: 'https' | 'http' | 'local' | 'unknown'
    methodHints?: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OTHER')[]
    rateLimitNotes?: string
    dataBoundaryNotes?: string
  }

  authMetadata: {
    authType: 'none' | 'api_key_required' | 'oauth_required' | 'token_required' | 'unknown'
    storesSecrets: false
    secretStorageRef?: never
    notes?: string
  }

  allowedRecordActions: (
    | 'create_external_action_proposal'
    | 'create_risk_assessment'
    | 'submit_review'
    | 'approve_record'
    | 'reject'
    | 'archive'
  )[]

  forbiddenActions: (
    | 'call_external_api'
    | 'connect_mcp'
    | 'send_network_request'
    | 'create_webhook'
    | 'create_worker'
    | 'create_queue'
    | 'send_message'
    | 'read_external_data'
    | 'write_external_data'
    | 'execute_toolrun'
    | 'start_agent'
    | 'complete_task'
  )[]

  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requiresHumanConfirmation: boolean
  sourceEvidenceRefs?: string[]
  sourceRedactionStatus: 'not_required' | 'redacted' | 'blocked'

  createdBy: 'human' | 'system' | 'agent_record'
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}
```

## Field Rules

- `endpointMetadata` is display metadata only and must not be dereferenced.
- `endpointMetadata` must not include secrets, tokens, Authorization headers, cookies, credentials, raw payloads, or embedded secret URLs.
- `endpointMetadata.methodHints` are human review metadata only.
- `methodHints` must not be consumed by API routes, routers, runtimes, workers, queues, or Tool Runtime as executable action types.
- `methodHints` must not trigger endpoint validation, schema discovery, network requests, webhook creation, or external writes.
- `authMetadata.storesSecrets` must be `false` in Sprint 13.
- `providerType = 'mcp'` must be paired with a disabled McpConnectionProfile record before UI display suggests MCP governance.
- `approved_record` means the profile was reviewed as a local record only.

## Safety Invariants

- ExternalIntegrationProfile must not become an API client configuration.
- ExternalIntegrationProfile must not create webhook subscriptions.
- ExternalIntegrationProfile must not create workers, queues, or background jobs.
- ExternalIntegrationProfile approval must not call, connect, send, sync, dispatch, execute, or complete anything.
