import type {
  EndpointMetadata,
  ExternalActionProposal,
  ExternalActionSourceKind,
  ExternalIntegrationProfile,
  McpConnectionProfile,
} from './types'
import { forbiddenExternalMcpStates } from './state-machine'

const secretKeyPattern = /secret|token|password|apikey|api_key|authorization|cookie|credential|privatekey|private_key|clientsecret|client_secret/i
const blockedKeyPattern = /rawpayload|raw_payload|rawrequest|raw_request|rawresponse|raw_response|headers|externalpayload|external_payload/i
const forbiddenActionPattern =
  /\b(connect mcp|call api|send message|sync now|invoke tool|create webhook|dispatch|execute|run integration|auto send|auto sync|retry|replay|rollback|resume execution|webhook dispatch|external api call|mcp session)\b/i
const endpointLikePattern = /^https?:\/\//i

export const allowedExternalActionSourceKinds: ExternalActionSourceKind[] = [
  'agent_result',
  'tool_result',
  'tool_execution_receipt',
  'collaboration_decision',
  'file_change_proposal',
  'pull_request_plan',
  'user_provided_snippet',
  'sanitized_context_snapshot',
]

export function sanitizeGovernanceSnapshot(value: unknown): unknown {
  const blocked = findBlockedPath(value)
  if (blocked) throw new Error(`Sprint 13 source snapshot contains blocked field ${blocked}.`)
  return sanitizeValue(value)
}

export function sanitizeEndpointMetadata(metadata: EndpointMetadata | undefined): EndpointMetadata | undefined {
  if (!metadata) return undefined
  const blocked = findBlockedPath(metadata)
  if (blocked) throw new Error(`Sprint 13 endpoint metadata contains blocked field ${blocked}.`)
  if (metadata.displayHost && secretKeyPattern.test(metadata.displayHost)) {
    throw new Error('Sprint 13 endpoint metadata host appears to contain secret material.')
  }
  if (metadata.displayPath && /token=|api_key=|key=|secret=|password=/i.test(metadata.displayPath)) {
    throw new Error('Sprint 13 endpoint metadata path must not contain embedded secrets.')
  }
  assertMethodHintsMetadataOnly(metadata.methodHints)
  return {
    displayHost: metadata.displayHost,
    displayPath: metadata.displayPath,
    protocol: metadata.protocol ?? 'unknown',
    methodHints: metadata.methodHints,
    rateLimitNotes: truncate(metadata.rateLimitNotes),
    dataBoundaryNotes: truncate(metadata.dataBoundaryNotes),
  }
}

export function assertMethodHintsMetadataOnly(methodHints?: string[]): void {
  if (!methodHints) return
  const allowed = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OTHER']
  for (const hint of methodHints) {
    if (!allowed.includes(hint)) throw new Error(`Unsupported methodHint: ${hint}`)
  }
}

export function assertProposedPayloadSummarySafe(summary?: string): void {
  if (!summary) return
  if (blockedKeyPattern.test(summary) || /authorization:|cookie:|bearer\s+|api[_-]?key|client[_-]?secret/i.test(summary)) {
    throw new Error('proposedPayloadSummary must not contain raw payloads, headers, tokens, cookies, or credentials.')
  }
}

export function assertNoEndpointDereference(input: unknown): void {
  const text = flattenText(input)
  if (/validate endpoint|endpoint reachability|discover schema|schema discovery|fetch external|dereference endpoint/i.test(text)) {
    throw new Error('Sprint 13 POST /from-* APIs must not dereference endpoints or discover external schemas.')
  }
}

export function assertNoForbiddenActionText(value: unknown): void {
  const text = flattenText(value)
  for (const state of forbiddenExternalMcpStates) {
    if (text.includes(state)) throw new Error(`Sprint 13 forbidden state text: ${state}`)
  }
  if (forbiddenActionPattern.test(text)) {
    throw new Error('Sprint 13 forbidden external execution wording detected.')
  }
}

export function assertNoExecutionCapabilities(record: Record<string, unknown>): void {
  const enabled = Object.entries(record).filter(([key, value]) => key.startsWith('can') && value === true)
  if (enabled.length > 0) {
    throw new Error(`Sprint 13 governance records cannot enable execution capabilities: ${enabled.map(([key]) => key).join(', ')}`)
  }
}

export function validateExternalIntegrationProfileDraft(input: Pick<ExternalIntegrationProfile,
  'name' | 'endpointMetadata' | 'authMetadata' | 'sourceRedactionStatus'
>): void {
  if (!input.name) throw new Error('ExternalIntegrationProfile.name is required.')
  if (input.authMetadata.storesSecrets !== false) throw new Error('ExternalIntegrationProfile must not store secrets.')
  if (input.sourceRedactionStatus === 'blocked') {
    // Blocked source marker is valid, but blocked content must not be present elsewhere.
  }
  sanitizeEndpointMetadata(input.endpointMetadata)
  assertNoForbiddenActionText([input.name, input.endpointMetadata])
}

export function validateMcpConnectionProfileDraft(input: Pick<McpConnectionProfile,
  'name' | 'profileMode' | 'connectionState' | 'serverMetadata' | 'authMetadata'
>): void {
  if (!input.name) throw new Error('McpConnectionProfile.name is required.')
  if (input.profileMode !== 'disabled_local_record') throw new Error('McpConnectionProfile must be disabled_local_record.')
  if (input.connectionState !== 'not_connected') throw new Error('McpConnectionProfile must remain not_connected.')
  if (input.authMetadata.storesSecrets !== false) throw new Error('McpConnectionProfile must not store secrets.')
  if (findBlockedPath(input.serverMetadata)) throw new Error('McpConnectionProfile metadata contains blocked secret fields.')
  assertNoForbiddenActionText([input.name, input.serverMetadata])
}

export function validateExternalActionProposalDraft(input: Pick<ExternalActionProposal,
  'sourceKind' | 'sourceSnapshot' | 'sourceRedactionStatus' | 'title' | 'summary' | 'proposedIntent' | 'proposedPayloadSummary'
>): void {
  if (!allowedExternalActionSourceKinds.includes(input.sourceKind)) throw new Error('Unsupported ExternalActionProposal sourceKind.')
  if (input.sourceRedactionStatus === 'blocked' && input.sourceSnapshot !== undefined) {
    throw new Error('Blocked payload content must not be persisted.')
  }
  assertProposedPayloadSummarySafe(input.proposedPayloadSummary)
  assertNoEndpointDereference(input)
  assertNoForbiddenActionText([input.title, input.summary, input.proposedIntent])
}

export function eventTypeForResource(resourceType: string, status: string): string {
  if (resourceType === 'external_integration_profile') return status === 'proposal' ? 'external_integration_profile.created' : `external_integration_profile.${status}`
  if (resourceType === 'mcp_connection_profile') return status === 'proposal' ? 'mcp_connection_profile.created' : `mcp_connection_profile.${status}`
  if (resourceType === 'external_action_proposal') return status === 'proposal' ? 'external_action.proposal_created' : `external_action.${status}`
  if (resourceType === 'integration_risk_assessment') return status === 'draft' ? 'integration_risk.assessment_created' : `integration_risk.${status}`
  if (resourceType === 'external_action_review_record') return status === 'review' ? 'external_action_review.created' : `external_action_review.${status}`
  return 'integration_audit_policy.recorded'
}

function findBlockedPath(value: unknown, path = '$'): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findBlockedPath(value[index], `${path}[${index}]`)
      if (found) return found
    }
    return undefined
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`
    if (blockedKeyPattern.test(key)) return childPath
    if (typeof child === 'string' && endpointLikePattern.test(child) && /token=|api_key=|secret=/i.test(child)) return childPath
    const found = findBlockedPath(child, childPath)
    if (found) return found
  }
  return undefined
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' ? truncate(value) : value
  }
  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    out[key] = secretKeyPattern.test(key) ? '[REDACTED]' : sanitizeValue(child)
  }
  return out
}

function truncate(value: string | undefined): string | undefined {
  return value && value.length > 1200 ? `${value.slice(0, 1200)}...` : value
}

function flattenText(value: unknown): string {
  if (typeof value === 'string') return value.toLowerCase()
  if (Array.isArray(value)) return value.map(flattenText).join('\n')
  if (value && typeof value === 'object') return Object.values(value).map(flattenText).join('\n')
  return ''
}
