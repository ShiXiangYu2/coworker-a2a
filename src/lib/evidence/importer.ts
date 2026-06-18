import {
  createEvidenceImportRecord,
} from './repository'
import type { CreateEvidenceInput, EvidenceItem, EvidenceSource, EvidenceStatus } from './types'

export async function importEvidence(input: CreateEvidenceInput): Promise<EvidenceItem> {
  const result = await createEvidenceImportRecord({
    sourceKind: input.source,
    title: input.title,
    userProvidedSummary: input.content,
    importedContentSummary: input.content,
    sourceMetadata: {
      urlHint: input.sourceUrl,
      externalSystemName: input.sourceId,
    },
    createdBy: input.importedBy === 'operator' ? 'operator' : 'user',
    idempotencyKey: input.idempotencyKey,
  })

  return {
    id: result.record.id,
    source: result.record.sourceKind as EvidenceSource,
    sourceId: null,
    sourceUrl: null,
    title: result.record.title,
    content: result.record.importedContentSummary,
    metadataJson: result.record.sourceMetadataJson,
    contentHash: '',
    contentSize: result.record.importedContentSummary.length,
    applicableAgentIds: [],
    applicableTaskTypes: [],
    tagsJson: '[]',
    status: result.record.status as EvidenceStatus,
    importedBy: result.record.createdBy,
    createdAt: result.record.createdAt,
    updatedAt: result.record.updatedAt,
  }
}

export async function importEvidenceBatch(
  inputs: CreateEvidenceInput[]
): Promise<{ imported: EvidenceItem[]; errors: { index: number; error: string }[] }> {
  const imported: EvidenceItem[] = []
  const errors: { index: number; error: string }[] = []
  for (let i = 0; i < inputs.length; i++) {
    try {
      imported.push(await importEvidence(inputs[i]))
    } catch (error) {
      errors.push({ index: i, error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }
  return { imported, errors }
}

export async function importFromJson(
  jsonString: string,
  options: { source?: EvidenceSource; title?: string; importedBy?: string } = {}
): Promise<EvidenceItem> {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    throw new Error('Invalid JSON format.')
  }
  return importEvidence({
    source: options.source ?? 'manual_json',
    title: options.title ?? 'Sanitized JSON Evidence',
    content: JSON.stringify(parsed, null, 2),
    importedBy: options.importedBy,
  })
}

export async function importFromText(
  text: string,
  options: { source?: EvidenceSource; title?: string; importedBy?: string } = {}
): Promise<EvidenceItem> {
  return importEvidence({
    source: options.source ?? 'manual_text',
    title: options.title ?? 'Text Evidence',
    content: text,
    importedBy: options.importedBy,
  })
}
