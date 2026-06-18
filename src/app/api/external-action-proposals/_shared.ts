import {
  ExternalMcpGovernanceRepositoryError,
  createExternalActionProposal,
} from '@/lib/external-mcp-governance/repository'
import type { EndpointMetadata } from '@/lib/external-mcp-governance/types'

export function externalMcpErrorResponse(error: unknown) {
  if (error instanceof ExternalMcpGovernanceRepositoryError) {
    return Response.json(
      { ok: false, error: { code: 'external_mcp_governance_error', message: error.message } },
      { status: error.status }
    )
  }
  if (error instanceof Error) {
    return Response.json(
      { ok: false, error: { code: 'validation_error', message: error.message } },
      { status: 400 }
    )
  }
  return Response.json(
    { ok: false, error: { code: 'unexpected_error', message: 'Unexpected Sprint 13 API error.' } },
    { status: 500 }
  )
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json()
  if (!isObject(body)) throw new Error('JSON body must be an object.')
  return body
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

export function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined
}

export function endpointMetadataValue(value: unknown): EndpointMetadata | undefined {
  if (!isObject(value)) return undefined
  return {
    displayHost: stringValue(value.displayHost),
    displayPath: stringValue(value.displayPath),
    protocol: stringValue(value.protocol) as EndpointMetadata['protocol'],
    methodHints: stringArray(value.methodHints) as EndpointMetadata['methodHints'],
    rateLimitNotes: stringValue(value.rateLimitNotes),
    dataBoundaryNotes: stringValue(value.dataBoundaryNotes),
  }
}

export function externalProposalDefaults(body: Record<string, unknown>) {
  return {
    title: stringValue(body.title),
    summary: stringValue(body.summary),
    proposedIntent: stringValue(body.proposedIntent),
    proposedPayloadSummary: stringValue(body.proposedPayloadSummary),
    actionCategory: stringValue(body.actionCategory) as never,
    dataClassification: stringValue(body.dataClassification) as never,
    riskLevel: stringValue(body.riskLevel) as never,
    createdBy: stringValue(body.createdBy) as never,
  }
}

export function localRecordPayload(data: Awaited<ReturnType<typeof createExternalActionProposal>>) {
  return {
    ok: true,
    data: data.externalActionProposal,
    auditEvents: data.auditEvents,
    observabilityEvents: data.observabilityEvents,
  }
}
