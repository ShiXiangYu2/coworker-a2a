import type { PrismaClient } from '@prisma/client'
import glossarySnapshot from './data/agent-director-glossary-core.json'

const BASE_IDEMPOTENCY_PREFIX = `feishu-base:${glossarySnapshot.snapshot.baseToken}`
const CREATED_BY = 'seed:agent-director-glossary'

export interface AgentDirectorGlossarySeedRecord {
  idempotencyKey: string
  conceptType: 'term'
  name: string
  displayName: string
  description: string
  definition: {
    englishTerm: string
    category: string
    subcategory: string
    priority: string
    sourceBasis: string | null
    tags: string[]
    promptTemplate: string
    sourceSnapshot: {
      baseName: string
      baseToken: string
      baseUrl: string
      tableId: string
      tableName: string
      viewId: string
      viewName: string
      recordId: string
    }
  }
  applicableTo: string[]
  relatedConcepts: string[]
  examples: string[]
  createdBy: string
}

type SnapshotRecord = (typeof glossarySnapshot.records)[number]

function splitTags(tags: string): string[] {
  return tags
    .split(';')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function buildIdempotencyKey(recordId: string): string {
  return `${BASE_IDEMPOTENCY_PREFIX}:${recordId}`
}

function mapSnapshotRecord(record: SnapshotRecord): AgentDirectorGlossarySeedRecord {
  return {
    idempotencyKey: buildIdempotencyKey(record.recordId),
    conceptType: 'term',
    name: record.name,
    displayName: record.displayName,
    description: record.description,
    definition: {
      englishTerm: record.name,
      category: record.category,
      subcategory: record.subcategory,
      priority: record.priority,
      sourceBasis: record.sourceBasis,
      tags: splitTags(record.tags),
      promptTemplate: record.promptTemplate,
      sourceSnapshot: {
        baseName: glossarySnapshot.snapshot.baseName,
        baseToken: glossarySnapshot.snapshot.baseToken,
        baseUrl: glossarySnapshot.snapshot.baseUrl,
        tableId: glossarySnapshot.snapshot.tableId,
        tableName: glossarySnapshot.snapshot.tableName,
        viewId: glossarySnapshot.snapshot.viewId,
        viewName: glossarySnapshot.snapshot.viewName,
        recordId: record.recordId,
      },
    },
    applicableTo: splitTags(record.tags),
    relatedConcepts: [],
    examples: [record.usageScenario],
    createdBy: CREATED_BY,
  }
}

export function buildAgentDirectorGlossarySeedRecords(): AgentDirectorGlossarySeedRecord[] {
  return glossarySnapshot.records.map(mapSnapshotRecord)
}

export async function seedAgentDirectorGlossary(
  prisma: PrismaClient
): Promise<{ upserted: number }> {
  const records = buildAgentDirectorGlossarySeedRecords()

  for (const record of records) {
    await prisma.conceptGlossary.upsert({
      where: { idempotencyKey: record.idempotencyKey },
      update: {
        conceptType: record.conceptType,
        name: record.name,
        displayName: record.displayName,
        description: record.description,
        definition: JSON.stringify(record.definition),
        applicableToJson: JSON.stringify(record.applicableTo),
        relatedConceptsJson: JSON.stringify(record.relatedConcepts),
        examplesJson: JSON.stringify(record.examples),
        status: 'active',
        version: 1,
        createdBy: record.createdBy,
      },
      create: {
        idempotencyKey: record.idempotencyKey,
        conceptType: record.conceptType,
        name: record.name,
        displayName: record.displayName,
        description: record.description,
        definition: JSON.stringify(record.definition),
        applicableToJson: JSON.stringify(record.applicableTo),
        relatedConceptsJson: JSON.stringify(record.relatedConcepts),
        examplesJson: JSON.stringify(record.examples),
        status: 'active',
        version: 1,
        createdBy: record.createdBy,
      },
    })
  }

  return { upserted: records.length }
}
