import {
  createDepartmentAgentRole,
  createDepartmentEscalationPolicy,
  createDepartmentPermissionBoundary,
  createDepartmentProfile,
  createDepartmentResponsibilityMatrix,
  createDepartmentReviewRecord,
  departmentErrorResponse,
  getDepartmentLinkedRecords,
  listDepartmentAgentRoles,
  listDepartmentEscalationPolicies,
  listDepartmentPermissionBoundaries,
  listDepartmentProfiles,
  listDepartmentResponsibilityMatrices,
  listDepartmentReviewRecords,
  transitionDepartmentRecord,
} from '@/lib/department'
import type {
  DepartmentCreatedBy,
  DepartmentEvidenceRef,
  DepartmentLocalAction,
  DepartmentProfileKind,
  DepartmentRecordStatus,
  DepartmentRecordType,
  DepartmentReviewVerdict,
  DepartmentReviewer,
  DepartmentRoleSeniority,
} from '@/lib/department'

export {
  createDepartmentAgentRole,
  createDepartmentEscalationPolicy,
  createDepartmentPermissionBoundary,
  createDepartmentProfile,
  createDepartmentResponsibilityMatrix,
  createDepartmentReviewRecord,
  departmentErrorResponse,
  getDepartmentLinkedRecords,
  listDepartmentAgentRoles,
  listDepartmentEscalationPolicies,
  listDepartmentPermissionBoundaries,
  listDepartmentProfiles,
  listDepartmentResponsibilityMatrices,
  listDepartmentReviewRecords,
  transitionDepartmentRecord,
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

export function evidenceRefs(value: unknown): DepartmentEvidenceRef[] {
  if (Array.isArray(value)) return value as DepartmentEvidenceRef[]
  return []
}

export function localActions(value: unknown): DepartmentLocalAction[] | undefined {
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value as DepartmentLocalAction[]
  }
  return undefined
}

export function createdBy(value: unknown): DepartmentCreatedBy {
  return (stringValue(value) ?? 'user') as DepartmentCreatedBy
}

export function profileKind(value: unknown): DepartmentProfileKind {
  return (stringValue(value) ?? 'custom') as DepartmentProfileKind
}

export function seniority(value: unknown): DepartmentRoleSeniority {
  return (stringValue(value) ?? 'member') as DepartmentRoleSeniority
}

export function reviewer(value: unknown): DepartmentReviewer {
  return (stringValue(value) ?? 'kelvin') as DepartmentReviewer
}

export function verdict(value: unknown): DepartmentReviewVerdict {
  return (stringValue(value) ?? 'needs_changes') as DepartmentReviewVerdict
}

export function statusParam(value: string | null): DepartmentRecordStatus | undefined {
  return value ? (value as DepartmentRecordStatus) : undefined
}

export function recordType(value: string): DepartmentRecordType {
  return value as DepartmentRecordType
}

