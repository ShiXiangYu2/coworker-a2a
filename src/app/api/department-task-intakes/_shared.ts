import {
  createDepartmentAssignmentApproval,
  createDepartmentAssignmentAudit,
  createDepartmentAssignmentProposal,
  createDepartmentRoleFitReview,
  createDepartmentTaskIntake,
  departmentAssignmentErrorResponse,
  getDepartmentAssignmentProposalAudit,
  getDepartmentAssignmentProposalLinked,
  getDepartmentAssignmentProposalRoleFit,
  getDepartmentAssignmentProposalTimeline,
  getDepartmentAssignmentRecordById,
  getDepartmentAssignmentReview,
  getDepartmentTaskIntakes,
  getTaskDepartmentAssignmentProposals,
  getTaskDepartmentIntake,
  listDepartmentAssignmentApprovals,
  listDepartmentAssignmentAudits,
  listDepartmentAssignmentProposals,
  listDepartmentRoleFitReviews,
  listDepartmentTaskIntakes,
  transitionDepartmentAssignmentRecord,
} from '@/lib/department-assignment'
import type {
  DepartmentAssignmentAuditActorType,
  DepartmentAssignmentAuditEventType,
  DepartmentAssignmentCreatedBy,
  DepartmentAssignmentEvidenceRef,
  DepartmentAssignmentRecordStatus,
  DepartmentAssignmentRecordType,
  DepartmentAssignmentReviewer,
  DepartmentAssignmentVerdict,
  DepartmentRoleFitLevel,
  DepartmentRoleFitRoleType,
  DepartmentTaskIntakeSource,
} from '@/lib/department-assignment'

export {
  createDepartmentAssignmentApproval,
  createDepartmentAssignmentAudit,
  createDepartmentAssignmentProposal,
  createDepartmentRoleFitReview,
  createDepartmentTaskIntake,
  departmentAssignmentErrorResponse,
  getDepartmentAssignmentProposalAudit,
  getDepartmentAssignmentProposalLinked,
  getDepartmentAssignmentProposalRoleFit,
  getDepartmentAssignmentProposalTimeline,
  getDepartmentAssignmentRecordById,
  getDepartmentAssignmentReview,
  getDepartmentTaskIntakes,
  getTaskDepartmentAssignmentProposals,
  getTaskDepartmentIntake,
  listDepartmentAssignmentApprovals,
  listDepartmentAssignmentAudits,
  listDepartmentAssignmentProposals,
  listDepartmentRoleFitReviews,
  listDepartmentTaskIntakes,
  transitionDepartmentAssignmentRecord,
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
  if (!s) throw new Error(name + ' is required.')
  return s
}

export function stringArray(value: unknown): string[] {
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value
  return []
}

export function evidenceRefs(value: unknown): DepartmentAssignmentEvidenceRef[] {
  if (Array.isArray(value)) return value as DepartmentAssignmentEvidenceRef[]
  return []
}

export function createdBy(value: unknown): DepartmentAssignmentCreatedBy {
  return (stringValue(value) ?? 'operator') as DepartmentAssignmentCreatedBy
}

export function intakeSource(value: unknown): DepartmentTaskIntakeSource {
  return (stringValue(value) ?? 'operator') as DepartmentTaskIntakeSource
}

export function roleType(value: unknown): DepartmentRoleFitRoleType {
  return (stringValue(value) ?? 'primary') as DepartmentRoleFitRoleType
}

export function fitLevel(value: unknown): DepartmentRoleFitLevel {
  return (stringValue(value) ?? 'partial') as DepartmentRoleFitLevel
}

export function reviewer(value: unknown): DepartmentAssignmentReviewer {
  return (stringValue(value) ?? 'kelvin') as DepartmentAssignmentReviewer
}

export function verdict(value: unknown): DepartmentAssignmentVerdict {
  return (stringValue(value) ?? 'needs_changes') as DepartmentAssignmentVerdict
}

export function auditEventType(value: unknown): DepartmentAssignmentAuditEventType {
  return (stringValue(value) ?? 'created') as DepartmentAssignmentAuditEventType
}

export function auditActorType(value: unknown): DepartmentAssignmentAuditActorType {
  return (stringValue(value) ?? 'system_record') as DepartmentAssignmentAuditActorType
}

export function statusParam(value: string | null): DepartmentAssignmentRecordStatus | undefined {
  return value ? (value as DepartmentAssignmentRecordStatus) : undefined
}

export function approvalTargetType(value: string): Exclude<DepartmentAssignmentRecordType, 'department_assignment_approval_record'> {
  return value as Exclude<DepartmentAssignmentRecordType, 'department_assignment_approval_record'>
}

export function auditTargetType(value: string): Exclude<DepartmentAssignmentRecordType, 'department_assignment_audit_record'> {
  return value as Exclude<DepartmentAssignmentRecordType, 'department_assignment_audit_record'>
}

export function optionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}
