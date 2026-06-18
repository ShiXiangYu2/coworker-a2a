import {
  createEvidenceImportRecord,
  createEvidenceReviewRecord,
  createEvidenceSourceProfile,
  evidenceErrorResponse,
  listEvidenceImports,
  listEvidenceRedactionPolicies,
  listEvidenceReviews,
  listEvidenceSourceProfiles,
  listSanitizedEvidenceSnapshots,
  transitionEvidenceRecordStatus,
} from '@/lib/evidence'
import type {
  EvidenceImportSourceMetadata,
  EvidenceReviewTargetType,
  EvidenceReviewVerdict,
  EvidenceReviewer,
  EvidenceSourceKind,
} from '@/lib/evidence'

export {
  createEvidenceImportRecord,
  createEvidenceReviewRecord,
  createEvidenceSourceProfile,
  evidenceErrorResponse,
  listEvidenceImports,
  listEvidenceRedactionPolicies,
  listEvidenceReviews,
  listEvidenceSourceProfiles,
  listSanitizedEvidenceSnapshots,
  transitionEvidenceRecordStatus,
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
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function requiredString(value: unknown, name: string): string {
  const s = stringValue(value)
  if (!s) throw new Error(`${name} is required.`)
  return s
}

export function stringArray(value: unknown): string[] {
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value
  return []
}

export function sourceMetadata(value: unknown): Partial<EvidenceImportSourceMetadata> {
  if (!isObject(value)) return {}
  return {
    pathHint: stringValue(value.pathHint),
    commandHint: stringValue(value.commandHint),
    urlHint: stringValue(value.urlHint),
    endpointHint: stringValue(value.endpointHint),
    mcpServerHint: stringValue(value.mcpServerHint),
    externalSystemName: stringValue(value.externalSystemName),
    screenshotDescription: stringValue(value.screenshotDescription),
  }
}

export function sourceKind(value: unknown): EvidenceSourceKind {
  return (stringValue(value) ?? 'manual_note') as EvidenceSourceKind
}

export function reviewTargetType(value: unknown): EvidenceReviewTargetType {
  return (stringValue(value) ?? 'evidence_import_record') as EvidenceReviewTargetType
}

export function reviewer(value: unknown): EvidenceReviewer {
  return (stringValue(value) ?? 'kelvin') as EvidenceReviewer
}

export function reviewVerdict(value: unknown): EvidenceReviewVerdict {
  return (stringValue(value) ?? 'needs_changes') as EvidenceReviewVerdict
}

export async function transitionImportRecord(id: string, targetStatus: string, reason: string) {
  return transitionEvidenceRecordStatus({
    recordType: 'evidence_import_record',
    id,
    targetStatus,
    reason,
  })
}

export async function transitionReviewRecord(id: string, targetStatus: string, reason: string) {
  return transitionEvidenceRecordStatus({
    recordType: 'evidence_review_record',
    id,
    targetStatus,
    reason,
  })
}
