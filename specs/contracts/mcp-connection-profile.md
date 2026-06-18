# Contract: McpConnectionProfile

Status: proposed for Sprint 13

## Purpose

McpConnectionProfile records local governance metadata about a possible MCP connection.

Sprint 13 MCP profiles are disabled local records only. They must not create MCP sessions, invoke MCP tools, discover remote tools, or connect to MCP servers.

## Schema

```ts
McpConnectionProfile {
  id: string
  schemaVersion: string
  correlationId: string
  externalIntegrationProfileId?: string

  name: string
  profileMode: 'disabled_local_record'
  connectionState: 'not_connected'

  status:
    | 'proposal'
    | 'draft'
    | 'review'
    | 'approved_record'
    | 'rejected'
    | 'superseded'
    | 'archived'

  serverMetadata?: {
    displayName?: string
    transportHint?: 'stdio' | 'http' | 'sse' | 'unknown'
    displayHost?: string
    capabilitySummary?: string
  }

  authMetadata: {
    authType: 'none' | 'token_required' | 'oauth_required' | 'unknown'
    storesSecrets: false
  }

  canConnect: false
  canInvokeTool: false
  canListTools: false
  canReadResources: false
  canWriteResources: false

  sourceEvidenceRefs?: string[]
  sourceRedactionStatus: 'not_required' | 'redacted' | 'blocked'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requiresHumanConfirmation: boolean

  createdBy: 'human' | 'system' | 'agent_record'
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}
```

## Field Rules

- `profileMode` must be `disabled_local_record`.
- `connectionState` must be `not_connected`.
- All capability booleans must be `false`.
- `serverMetadata` must not include secrets, tokens, headers, cookies, private keys, raw MCP payloads, or embedded credentials.
- MCP tool and resource schemas must not be fetched. Capability summaries can only be user-provided or derived from sanitized context snapshots.

## Safety Invariants

- McpConnectionProfile must not create a McpSession.
- McpConnectionProfile must not invoke tools.
- McpConnectionProfile must not list tools or read resources from a live server.
- Approval only changes local record status.
