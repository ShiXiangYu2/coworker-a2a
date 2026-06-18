import { describe, expect, it } from 'vitest'
import {
  assertNoEndpointDereference,
  assertNoExecutionCapabilities,
  assertProposedPayloadSummarySafe,
  sanitizeEndpointMetadata,
  sanitizeGovernanceSnapshot,
  validateExternalActionProposalDraft,
  validateExternalIntegrationProfileDraft,
  validateMcpConnectionProfileDraft,
} from '../rules'

describe('Sprint 13 External / MCP governance rules', () => {
  it('keeps endpoint metadata secret-free and method hints metadata-only', () => {
    expect(sanitizeEndpointMetadata({
      displayHost: 'api.example.test',
      displayPath: '/v1/items',
      methodHints: ['GET', 'POST'],
    })).toEqual({
      displayHost: 'api.example.test',
      displayPath: '/v1/items',
      protocol: 'unknown',
      methodHints: ['GET', 'POST'],
      rateLimitNotes: undefined,
      dataBoundaryNotes: undefined,
    })

    expect(() => sanitizeEndpointMetadata({ displayPath: '/v1/items?token=secret' })).toThrow()
  })

  it('blocks raw external payloads and credentials from proposal summaries', () => {
    expect(() => assertProposedPayloadSummarySafe('Summary only: create a governance proposal.')).not.toThrow()
    expect(() => assertProposedPayloadSummarySafe('Authorization: Bearer abc')).toThrow()
    expect(() => assertProposedPayloadSummarySafe('rawPayload={"secret":true}')).toThrow()
  })

  it('blocks endpoint dereference and schema discovery language in from-source payloads', () => {
    expect(() => assertNoEndpointDereference({ summary: 'local record only' })).not.toThrow()
    expect(() => assertNoEndpointDereference({ summary: 'validate endpoint reachability first' })).toThrow()
    expect(() => assertNoEndpointDereference({ summary: 'discover schema from service' })).toThrow()
  })

  it('keeps source evidence sanitized and evidence-only', () => {
    expect(sanitizeGovernanceSnapshot({ token: 'abc', summary: 'ok' })).toEqual({ token: '[REDACTED]', summary: 'ok' })
    expect(() => sanitizeGovernanceSnapshot({ rawPayload: { unsafe: true } })).toThrow()
  })

  it('validates ExternalIntegrationProfile as local governance only', () => {
    expect(() => validateExternalIntegrationProfileDraft({
      name: 'Example integration profile',
      endpointMetadata: { displayHost: 'api.example.test', methodHints: ['GET'] },
      authMetadata: { authType: 'unknown', storesSecrets: false },
      sourceRedactionStatus: 'not_required',
    })).not.toThrow()

    expect(() => validateExternalIntegrationProfileDraft({
      name: 'Example integration profile',
      endpointMetadata: { displayHost: 'api.example.test' },
      authMetadata: { authType: 'token_required', storesSecrets: true as false },
      sourceRedactionStatus: 'not_required',
    })).toThrow()
  })

  it('requires McpConnectionProfile to remain disabled local record only', () => {
    expect(() => validateMcpConnectionProfileDraft({
      name: 'MCP profile',
      profileMode: 'disabled_local_record',
      connectionState: 'not_connected',
      authMetadata: { authType: 'unknown', storesSecrets: false },
    })).not.toThrow()

    expect(() => validateMcpConnectionProfileDraft({
      name: 'MCP profile',
      profileMode: 'connected' as never,
      connectionState: 'not_connected',
      authMetadata: { authType: 'unknown', storesSecrets: false },
    })).toThrow()
  })

  it('validates ExternalActionProposal without creating execution permission', () => {
    expect(() => validateExternalActionProposalDraft({
      sourceKind: 'tool_execution_receipt',
      sourceSnapshot: { receiptId: 'receipt_1', sideEffects: [] },
      sourceRedactionStatus: 'not_required',
      title: 'External governance proposal',
      summary: 'Sanitized evidence only.',
      proposedIntent: 'Record future integration review intent.',
    })).not.toThrow()

    expect(() => assertNoExecutionCapabilities({ canCallExternalApi: true })).toThrow()
    expect(() => assertNoExecutionCapabilities({ canConnectMcp: true })).toThrow()
    expect(() => assertNoExecutionCapabilities({ canCreateWebhook: true })).toThrow()
  })
})
