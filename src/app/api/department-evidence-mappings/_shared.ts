import {
  createDepartmentEvidenceCoverage,
  createDepartmentMappingReviewRecord,
  createDepartmentReviewGap,
  createEvidenceToDepartmentMapping,
  departmentMappingErrorResponse,
  getDepartmentEvidenceMap,
  getDepartmentMappingAudit,
  getDepartmentMappingTimeline,
  listDepartmentEvidenceCoverages,
  listDepartmentMappingReviewRecords,
  listDepartmentReviewGaps,
  listEvidenceToDepartmentMappings,
  transitionDepartmentMappingRecord,
} from '@/lib/department-mapping'
import type {
  DepartmentEvidenceCoverageLevel,
  DepartmentMappingCreatedBy,
  DepartmentMappingDepartmentRecordType,
  DepartmentMappingEvidenceRecordType,
  DepartmentMappingEvidenceRef,
  DepartmentMappingRecordStatus,
  DepartmentMappingRecordType,
  DepartmentMappingReviewVerdict,
  DepartmentMappingReviewer,
  DepartmentMappingStrength,
  DepartmentReviewGapRiskLevel,
} from '@/lib/department-mapping'

export {
  createDepartmentEvidenceCoverage,
  createDepartmentMappingReviewRecord,
  createDepartmentReviewGap,
  createEvidenceToDepartmentMapping,
  departmentMappingErrorResponse,
  getDepartmentEvidenceMap,
  getDepartmentMappingAudit,
  getDepartmentMappingTimeline,
  listDepartmentEvidenceCoverages,
  listDepartmentMappingReviewRecords,
  listDepartmentReviewGaps,
  listEvidenceToDepartmentMappings,
  transitionDepartmentMappingRecord,
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

export function evidenceRefs(value: unknown): DepartmentMappingEvidenceRef[] {
  if (Array.isArray(value)) return value as DepartmentMappingEvidenceRef[]
  return []
}

export function createdBy(value: unknown): DepartmentMappingCreatedBy {
  return (stringValue(value) ?? 'user') as DepartmentMappingCreatedBy
}

export function evidenceRecordType(value: unknown): DepartmentMappingEvidenceRecordType {
  return requiredString(value, 'evidenceRecordType') as DepartmentMappingEvidenceRecordType
}

export function departmentRecordType(value: unknown): DepartmentMappingDepartmentRecordType {
  return requiredString(value, 'departmentRecordType') as DepartmentMappingDepartmentRecordType
}

export function mappingStrength(value: unknown): DepartmentMappingStrength {
  return (stringValue(value) ?? 'supporting') as DepartmentMappingStrength
}

export function coverageLevel(value: unknown): DepartmentEvidenceCoverageLevel {
  return (stringValue(value) ?? 'partial') as DepartmentEvidenceCoverageLevel
}

export function riskLevel(value: unknown): DepartmentReviewGapRiskLevel {
  return (stringValue(value) ?? 'medium') as DepartmentReviewGapRiskLevel
}

export function reviewer(value: unknown): DepartmentMappingReviewer {
  return (stringValue(value) ?? 'kelvin') as DepartmentMappingReviewer
}

export function verdict(value: unknown): DepartmentMappingReviewVerdict {
  return (stringValue(value) ?? 'needs_changes') as DepartmentMappingReviewVerdict
}

export function statusParam(value: string | null): DepartmentMappingRecordStatus | undefined {
  return value ? (value as DepartmentMappingRecordStatus) : undefined
}

export function recordType(value: string): DepartmentMappingRecordType {
  return value as DepartmentMappingRecordType
}

export function reviewTargetType(value: string): Exclude<DepartmentMappingRecordType, 'department_mapping_review_record'> {
  return value as Exclude<DepartmentMappingRecordType, 'department_mapping_review_record'>
}
