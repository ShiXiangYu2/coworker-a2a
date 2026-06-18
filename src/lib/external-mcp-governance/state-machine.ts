import type { ExternalMcpEvent, ExternalMcpStatus } from './types'

export class InvalidExternalMcpTransitionError extends Error {
  constructor(
    public readonly currentStatus: string,
    public readonly event: string
  ) {
    super(`Invalid External / MCP governance transition: ${currentStatus} -> ${event}`)
    this.name = 'InvalidExternalMcpTransitionError'
  }
}

const transitions = new Map<string, ExternalMcpStatus>([
  ['proposal:DRAFT', 'draft'],
  ['proposal:SUBMIT_REVIEW', 'review'],
  ['proposal:REJECT', 'rejected'],
  ['proposal:SUPERSEDE', 'superseded'],
  ['draft:SUBMIT_REVIEW', 'review'],
  ['draft:REJECT', 'rejected'],
  ['draft:SUPERSEDE', 'superseded'],
  ['review:APPROVE_RECORD', 'approved_record'],
  ['review:REJECT', 'rejected'],
  ['review:SUPERSEDE', 'superseded'],
  ['approved_record:ARCHIVE', 'archived'],
  ['rejected:ARCHIVE', 'archived'],
  ['superseded:ARCHIVE', 'archived'],
])

export const forbiddenExternalMcpStates = [
  'connected',
  'called',
  'sent',
  'synced',
  'webhook_created',
  'mcp_invoked',
  'external_updated',
  'executed',
  'running',
  'dispatched',
  'queued',
  'retried',
  'replayed',
  'rolled_back',
  'resumed',
] as const

export function transitionExternalMcpRecord(
  currentStatus: ExternalMcpStatus,
  event: ExternalMcpEvent
): ExternalMcpStatus {
  const next = transitions.get(`${currentStatus}:${event}`)
  if (!next) throw new InvalidExternalMcpTransitionError(currentStatus, event)
  return next
}

export function assertNoForbiddenExternalMcpState(status: string): void {
  if ((forbiddenExternalMcpStates as readonly string[]).includes(status)) {
    throw new Error(`Sprint 13 forbidden execution state: ${status}`)
  }
}
