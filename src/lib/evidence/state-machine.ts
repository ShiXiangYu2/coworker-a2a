import type { EvidenceImportEvent, EvidenceImportStatus } from './types'

export const EVIDENCE_IMPORT_STATUSES: readonly EvidenceImportStatus[] = [
  'draft',
  'review',
  'approved_record',
  'rejected',
  'archived',
]

const transitions: Record<EvidenceImportStatus, Partial<Record<EvidenceImportEvent, EvidenceImportStatus>>> = {
  draft: {
    SUBMIT_REVIEW: 'review',
    ARCHIVE: 'archived',
  },
  review: {
    APPROVE_RECORD: 'approved_record',
    REJECT: 'rejected',
    ARCHIVE: 'archived',
  },
  approved_record: {
    ARCHIVE: 'archived',
  },
  rejected: {
    ARCHIVE: 'archived',
  },
  archived: {},
}

export function isValidEvidenceImportStatus(status: string): status is EvidenceImportStatus {
  return (EVIDENCE_IMPORT_STATUSES as readonly string[]).includes(status)
}

export function transitionEvidenceImportStatus(
  current: EvidenceImportStatus,
  event: EvidenceImportEvent
): EvidenceImportStatus {
  const next = transitions[current][event]
  if (!next) {
    throw new Error(`Invalid Sprint 17 evidence transition from "${current}" via "${event}".`)
  }
  return next
}

