# Contract: IntegrationRiskAssessment

Status: proposed for Sprint 13

## Purpose

IntegrationRiskAssessment records the risk analysis for an ExternalActionProposal, ExternalIntegrationProfile, or McpConnectionProfile.

It is recommendation-only evidence and must not approve or execute anything.

## Schema

```ts
IntegrationRiskAssessment {
  id: string
  schemaVersion: string
  correlationId: string
  targetType:
    | 'external_integration_profile'
    | 'mcp_connection_profile'
    | 'external_action_proposal'
  targetId: string

  status: 'draft' | 'review' | 'approved_record' | 'rejected' | 'archived'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'

  riskFactors: {
    id: string
    category:
      | 'secrets'
      | 'privacy'
      | 'data_exfiltration'
      | 'external_side_effect'
      | 'auth_scope'
      | 'rate_limit'
      | 'compliance'
      | 'mcp_tool_surface'
      | 'webhook_surface'
      | 'unknown'
    severity: 'low' | 'medium' | 'high' | 'critical'
    summary: string
    mitigation?: string
  }[]

  recommendation:
    | 'record_only_safe_to_review'
    | 'requires_kelvin_review'
    | 'blocked_until_redacted'
    | 'reject_recommended'

  evidenceRefs?: string[]
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}
```

## Safety Invariants

- Risk recommendation is not permission.
- `approved_record` is not an execution token.
- Risk assessment must not call external APIs or MCP to verify claims.
- Risk assessment must not fetch external schemas or data.
- Risk assessment must not satisfy Kelvin confirmation automatically.
