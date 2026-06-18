import { decodeJson } from '@/lib/harmony/serializers'
import type {
  FailureClassification,
  ObservabilityEvent,
  RecoveryPoint,
  ResumeToken,
  RunJournal,
} from './types'

function dateToString(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined
}

export function serializeObservabilityEvent(record: {
  id: string
  schemaVersion: string
  correlationId: string
  resourceType: string
  resourceId: string
  eventType: string
  severity: string
  message: string
  source: string
  attributesJson: string | null
  redactionJson: string | null
  createdAt: Date
}): ObservabilityEvent {
  return {
    id: record.id,
    schemaVersion: record.schemaVersion,
    correlationId: record.correlationId,
    resourceType: record.resourceType as ObservabilityEvent['resourceType'],
    resourceId: record.resourceId,
    eventType: record.eventType,
    severity: record.severity as ObservabilityEvent['severity'],
    message: record.message,
    source: record.source as ObservabilityEvent['source'],
    attributes: decodeJson(record.attributesJson, undefined),
    redaction: decodeJson(record.redactionJson, undefined),
    createdAt: record.createdAt.toISOString(),
  }
}

export function serializeRunJournal(record: {
  id: string
  schemaVersion: string
  runType: string
  runId: string
  correlationId: string
  seq: number
  eventRefType: string
  eventRefId: string
  eventId: string | null
  phase: string | null
  stateBefore: string | null
  stateAfter: string | null
  inputHash: string | null
  outputHash: string | null
  inputSnapshotJson: string | null
  outputSnapshotJson: string | null
  result: string
  failureClassificationId: string | null
  createdAt: Date
}): RunJournal {
  return {
    id: record.id,
    schemaVersion: record.schemaVersion,
    runType: record.runType as RunJournal['runType'],
    runId: record.runId,
    correlationId: record.correlationId,
    seq: record.seq,
    eventRefType: record.eventRefType as RunJournal['eventRefType'],
    eventRefId: record.eventRefId,
    eventId: record.eventId ?? undefined,
    phase: record.phase ?? undefined,
    stateBefore: record.stateBefore ?? undefined,
    stateAfter: record.stateAfter ?? undefined,
    inputHash: record.inputHash ?? undefined,
    outputHash: record.outputHash ?? undefined,
    inputSnapshot: decodeJson(record.inputSnapshotJson, undefined),
    outputSnapshot: decodeJson(record.outputSnapshotJson, undefined),
    result: record.result as RunJournal['result'],
    failureClassificationId: record.failureClassificationId ?? undefined,
    createdAt: record.createdAt.toISOString(),
  }
}

export function serializeRecoveryPoint(record: {
  id: string
  schemaVersion: string
  snapshotSchemaVersion: string
  correlationId: string
  resourceType: string
  resourceId: string
  resourceStatusAtSnapshot: string | null
  reason: string
  snapshotJson: string | null
  snapshotHash: string | null
  redactionStatus: string
  redactionJson: string | null
  restorableViewOnly: boolean
  canTriggerExecution: boolean
  createdBy: string
  createdAt: Date
}): RecoveryPoint {
  return {
    id: record.id,
    schemaVersion: record.schemaVersion,
    snapshotSchemaVersion: record.snapshotSchemaVersion,
    correlationId: record.correlationId,
    resourceType: record.resourceType as RecoveryPoint['resourceType'],
    resourceId: record.resourceId,
    resourceStatusAtSnapshot: record.resourceStatusAtSnapshot ?? undefined,
    reason: record.reason,
    snapshot: decodeJson(record.snapshotJson, undefined),
    snapshotHash: record.snapshotHash ?? undefined,
    redactionStatus: record.redactionStatus as RecoveryPoint['redactionStatus'],
    redaction: decodeJson(record.redactionJson, undefined),
    restorableViewOnly: true,
    canTriggerExecution: false,
    createdBy: record.createdBy,
    createdAt: record.createdAt.toISOString(),
  }
}

export function serializeResumeToken(record: {
  id: string
  schemaVersion: string
  tokenHash: string
  correlationId: string
  resourceType: string
  resourceId: string
  mode: string
  viewContextJson: string
  maxUses: number | null
  useCount: number
  expiresAt: Date | null
  revokedAt: Date | null
  revokedReason: string | null
  createdBy: string
  lastUsedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): ResumeToken {
  return {
    id: record.id,
    schemaVersion: record.schemaVersion,
    tokenHash: record.tokenHash,
    correlationId: record.correlationId,
    resourceType: record.resourceType as ResumeToken['resourceType'],
    resourceId: record.resourceId,
    mode: 'view_only',
    viewContext: decodeJson(record.viewContextJson, {}),
    maxUses: record.maxUses ?? undefined,
    useCount: record.useCount,
    expiresAt: dateToString(record.expiresAt),
    revokedAt: dateToString(record.revokedAt),
    revokedReason: record.revokedReason ?? undefined,
    createdBy: record.createdBy,
    lastUsedAt: dateToString(record.lastUsedAt),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function serializeFailureClassification(record: {
  id: string
  schemaVersion: string
  correlationId: string
  resourceType: string
  resourceId: string
  category: string
  severity: string
  retryable: boolean
  retryableReason: string
  message: string
  evidenceJson: string | null
  createdBy: string
  createdAt: Date
}): FailureClassification {
  return {
    id: record.id,
    schemaVersion: record.schemaVersion,
    correlationId: record.correlationId,
    resourceType: record.resourceType as FailureClassification['resourceType'],
    resourceId: record.resourceId,
    category: record.category as FailureClassification['category'],
    severity: record.severity as FailureClassification['severity'],
    retryable: record.retryable,
    retryableReason: record.retryableReason,
    message: record.message,
    evidence: decodeJson(record.evidenceJson, undefined),
    createdBy: record.createdBy,
    createdAt: record.createdAt.toISOString(),
  }
}

