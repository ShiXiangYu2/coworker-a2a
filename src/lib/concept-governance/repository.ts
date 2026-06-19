import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'

// ========== Concept Glossary ==========

export interface ConceptGlossary {
  id: string
  conceptType: string
  name: string
  displayName: string
  description: string
  definition: Record<string, unknown>
  applicableTo: string[]
  relatedConcepts: string[]
  examples: string[]
  status: string
  version: number
  createdBy: string
  reviewedBy?: string
  reviewedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type ConceptType =
  | 'term'
  | 'risk_classification'
  | 'execution_boundary'
  | 'lifecycle_phase'
  | 'review_criteria'
  | 'policy'

export interface CreateConceptGlossaryInput {
  conceptType: ConceptType
  name: string
  displayName: string
  description: string
  definition?: Record<string, unknown>
  applicableTo?: string[]
  relatedConcepts?: string[]
  examples?: string[]
  createdBy: string
}

export async function createConceptGlossary(
  input: CreateConceptGlossaryInput
): Promise<ConceptGlossary> {
  const id = randomUUID()

  const record = await prisma.conceptGlossary.create({
    data: {
      id,
      conceptType: input.conceptType,
      name: input.name,
      displayName: input.displayName,
      description: input.description,
      definition: JSON.stringify(input.definition ?? {}),
      applicableToJson: JSON.stringify(input.applicableTo ?? []),
      relatedConceptsJson: JSON.stringify(input.relatedConcepts ?? []),
      examplesJson: JSON.stringify(input.examples ?? []),
      status: 'active',
      version: 1,
      createdBy: input.createdBy,
    },
  })

  return serializeConceptGlossary(record)
}

export async function listConceptGlossary(filters: {
  conceptType?: string
  status?: string
  limit?: number
} = {}): Promise<ConceptGlossary[]> {
  const limit = filters.limit ?? 100

  const records = await prisma.conceptGlossary.findMany({
    where: {
      conceptType: filters.conceptType,
      status: filters.status,
    },
    orderBy: [{ conceptType: 'asc' }, { name: 'asc' }],
    take: limit,
  })

  return records.map(serializeConceptGlossary)
}

export async function getConceptGlossary(id: string): Promise<ConceptGlossary | null> {
  const record = await prisma.conceptGlossary.findUnique({
    where: { id },
  })

  return record ? serializeConceptGlossary(record) : null
}

// ========== Policy Record ==========

export interface PolicyRecord {
  id: string
  policyType: string
  name: string
  displayName: string
  description: string
  rules: PolicyRule[]
  constraints: PolicyConstraint[]
  applicableTo: string[]
  riskLevel: string
  requiresHumanApproval: boolean
  status: string
  version: number
  effectiveFrom?: Date
  effectiveUntil?: Date
  createdBy: string
  reviewedBy?: string
  reviewedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface PolicyRule {
  id: string
  name: string
  description: string
  condition: string
  action: string
  priority: number
}

export interface PolicyConstraint {
  id: string
  name: string
  description: string
  type: 'required' | 'forbidden' | 'conditional'
  value: string
}

export type PolicyType =
  | 'tool_permission'
  | 'agent_routing'
  | 'execution_safety'
  | 'review_criteria'
  | 'risk_assessment'

export interface CreatePolicyRecordInput {
  policyType: PolicyType
  name: string
  displayName: string
  description: string
  rules?: PolicyRule[]
  constraints?: PolicyConstraint[]
  applicableTo?: string[]
  riskLevel?: string
  requiresHumanApproval?: boolean
  effectiveFrom?: Date
  effectiveUntil?: Date
  createdBy: string
}

export async function createPolicyRecord(
  input: CreatePolicyRecordInput
): Promise<PolicyRecord> {
  const id = randomUUID()

  const record = await prisma.policyRecord.create({
    data: {
      id,
      policyType: input.policyType,
      name: input.name,
      displayName: input.displayName,
      description: input.description,
      rulesJson: JSON.stringify(input.rules ?? []),
      constraintsJson: JSON.stringify(input.constraints ?? []),
      applicableToJson: JSON.stringify(input.applicableTo ?? []),
      riskLevel: input.riskLevel ?? 'low',
      requiresHumanApproval: input.requiresHumanApproval ?? false,
      status: 'active',
      version: 1,
      effectiveFrom: input.effectiveFrom,
      effectiveUntil: input.effectiveUntil,
      createdBy: input.createdBy,
    },
  })

  return serializePolicyRecord(record)
}

export async function listPolicyRecords(filters: {
  policyType?: string
  status?: string
  riskLevel?: string
  limit?: number
} = {}): Promise<PolicyRecord[]> {
  const limit = filters.limit ?? 100

  const records = await prisma.policyRecord.findMany({
    where: {
      policyType: filters.policyType,
      status: filters.status,
      riskLevel: filters.riskLevel,
    },
    orderBy: [{ policyType: 'asc' }, { name: 'asc' }],
    take: limit,
  })

  return records.map(serializePolicyRecord)
}

export async function getPolicyRecord(id: string): Promise<PolicyRecord | null> {
  const record = await prisma.policyRecord.findUnique({
    where: { id },
  })

  return record ? serializePolicyRecord(record) : null
}

// ========== Serializers ==========

function serializeConceptGlossary(record: {
  id: string
  conceptType: string
  name: string
  displayName: string
  description: string
  definition: string
  applicableToJson: string
  relatedConceptsJson: string
  examplesJson: string
  status: string
  version: number
  createdBy: string
  reviewedBy: string | null
  reviewedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): ConceptGlossary {
  return {
    id: record.id,
    conceptType: record.conceptType,
    name: record.name,
    displayName: record.displayName,
    description: record.description,
    definition: JSON.parse(record.definition),
    applicableTo: JSON.parse(record.applicableToJson),
    relatedConcepts: JSON.parse(record.relatedConceptsJson),
    examples: JSON.parse(record.examplesJson),
    status: record.status,
    version: record.version,
    createdBy: record.createdBy,
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: record.reviewedAt ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

function serializePolicyRecord(record: {
  id: string
  policyType: string
  name: string
  displayName: string
  description: string
  rulesJson: string
  constraintsJson: string
  applicableToJson: string
  riskLevel: string
  requiresHumanApproval: boolean
  status: string
  version: number
  effectiveFrom: Date | null
  effectiveUntil: Date | null
  createdBy: string
  reviewedBy: string | null
  reviewedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): PolicyRecord {
  return {
    id: record.id,
    policyType: record.policyType,
    name: record.name,
    displayName: record.displayName,
    description: record.description,
    rules: JSON.parse(record.rulesJson),
    constraints: JSON.parse(record.constraintsJson),
    applicableTo: JSON.parse(record.applicableToJson),
    riskLevel: record.riskLevel,
    requiresHumanApproval: record.requiresHumanApproval,
    status: record.status,
    version: record.version,
    effectiveFrom: record.effectiveFrom ?? undefined,
    effectiveUntil: record.effectiveUntil ?? undefined,
    createdBy: record.createdBy,
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: record.reviewedAt ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}
