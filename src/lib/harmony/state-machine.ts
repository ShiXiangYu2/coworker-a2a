import type { HarmonyTaskEvent, HarmonyTaskStatus } from './types'

const transitions = new Map<string, HarmonyTaskStatus>([
  ['none:CREATE_FROM_ROUTE', 'draft'],
  ['draft:QUEUE', 'queued'],
  ['draft:REQUIRE_CONFIRMATION', 'pending_confirmation'],
  ['draft:BLOCK', 'blocked'],
  ['pending_confirmation:APPROVE_CONFIRMATION', 'queued'],
  ['pending_confirmation:REJECT_CONFIRMATION', 'blocked'],
  ['pending_confirmation:CANCEL', 'cancelled'],
  ['queued:ASSIGN_PLACEHOLDER', 'assigned'],
  ['queued:BLOCK', 'blocked'],
  ['queued:CANCEL', 'cancelled'],
  ['assigned:BLOCK', 'blocked'],
  ['assigned:CANCEL', 'cancelled'],
  ['assigned:REQUEST_CONFIRMATION_FROM_ANALYSIS', 'pending_confirmation'],
  ['assigned:MARK_COMPLETED', 'completed'],
  ['draft:FAIL', 'failed'],
  ['pending_confirmation:FAIL', 'failed'],
  ['queued:FAIL', 'failed'],
  ['assigned:FAIL', 'failed'],
  ['blocked:FAIL', 'failed'],
])

export class InvalidHarmonyTransitionError extends Error {
  constructor(
    public readonly currentStatus: HarmonyTaskStatus | 'none',
    public readonly event: HarmonyTaskEvent
  ) {
    super(`Invalid Harmony transition: ${currentStatus} -> ${event}`)
    this.name = 'InvalidHarmonyTransitionError'
  }
}

export function transitionHarmonyTask(
  currentStatus: HarmonyTaskStatus | undefined,
  event: HarmonyTaskEvent
): HarmonyTaskStatus {
  const from = currentStatus ?? 'none'
  const next = transitions.get(`${from}:${event}`)

  if (!next) {
    throw new InvalidHarmonyTransitionError(from, event)
  }

  return next
}

export function canTransitionHarmonyTask(
  currentStatus: HarmonyTaskStatus | undefined,
  event: HarmonyTaskEvent
): boolean {
  try {
    transitionHarmonyTask(currentStatus, event)
    return true
  } catch {
    return false
  }
}
