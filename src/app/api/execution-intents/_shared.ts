import {
  createExecutionApproval,
  createExecutionGate,
  createExecutionIntent,
  createExecutionPlan,
  createExecutionReceipt,
  executionGatewayErrorResponse,
  getDepartmentExecutionReview,
  getExecutionIntentAudit,
  getExecutionIntentLinked,
  getExecutionIntentTimeline,
  getTaskExecutionIntents,
  listExecutionApprovals,
  listExecutionGates,
  listExecutionIntents,
  listExecutionPlans,
  listExecutionReceipts,
  transitionExecutionGatewayRecord,
} from '@/lib/execution-gateway'
import type {
  ExecutionCreatedBy,
  ExecutionEvidenceRef,
  ExecutionGatewayRecordStatus,
  ExecutionGatewayRecordType,
  ExecutionGateDecision,
  ExecutionGateRequiredReviewer,
  ExecutionReceiptKind,
  ExecutionRequestedBy,
  ExecutionReviewer,
  ExecutionReviewVerdict,
} from '@/lib/execution-gateway'

export {
  createExecutionApproval,
  createExecutionGate,
  createExecutionIntent,
  createExecutionPlan,
  createExecutionReceipt,
  executionGatewayErrorResponse,
  getDepartmentExecutionReview,
  getExecutionIntentAudit,
  getExecutionIntentLinked,
  getExecutionIntentTimeline,
  getTaskExecutionIntents,
  listExecutionApprovals,
  listExecutionGates,
  listExecutionIntents,
  listExecutionPlans,
  listExecutionReceipts,
  transitionExecutionGatewayRecord,
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

export function evidenceRefs(value: unknown): ExecutionEvidenceRef[] {
  if (Array.isArray(value)) return value as ExecutionEvidenceRef[]
  return []
}

export function createdBy(value: unknown): ExecutionCreatedBy {
  return (stringValue(value) ?? 'operator') as ExecutionCreatedBy
}

export function requestedBy(value: unknown): ExecutionRequestedBy {
  return (stringValue(value) ?? 'operator') as ExecutionRequestedBy
}

export function reviewer(value: unknown): ExecutionReviewer {
  return (stringValue(value) ?? 'kelvin') as ExecutionReviewer
}

export function verdict(value: unknown): ExecutionReviewVerdict {
  return (stringValue(value) ?? 'needs_changes') as ExecutionReviewVerdict
}

export function gateDecision(value: unknown): ExecutionGateDecision {
  return (stringValue(value) ?? 'pending_review') as ExecutionGateDecision
}

export function requiredReviewer(value: unknown): ExecutionGateRequiredReviewer {
  return (stringValue(value) ?? 'kelvin') as ExecutionGateRequiredReviewer
}

export function receiptKind(value: unknown): ExecutionReceiptKind {
  return (stringValue(value) ?? 'manual_review_record') as ExecutionReceiptKind
}

export function statusParam(value: string | null): ExecutionGatewayRecordStatus | undefined {
  return value ? (value as ExecutionGatewayRecordStatus) : undefined
}

export function recordType(value: string): ExecutionGatewayRecordType {
  return value as ExecutionGatewayRecordType
}

export function reviewTargetType(value: string): Exclude<ExecutionGatewayRecordType, 'execution_approval_record'> {
  return value as Exclude<ExecutionGatewayRecordType, 'execution_approval_record'>
}
