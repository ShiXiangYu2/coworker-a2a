import { createHash } from 'node:crypto'
import type {
  CreateEvidenceImportInput,
  CreateEvidenceInput,
  CreateEvidenceReviewInput,
  CreateEvidenceSourceProfileInput,
  EvidenceImportSourceMetadata,
  EvidenceSource,
  EvidenceSourceKind,
  EvidenceSourceProfile,
  EvidenceRedactionPolicy,
  EvidenceReviewRecord,
  SanitizedEvidenceSnapshot,
} from './types'
import {
  FORBIDDEN_EVIDENCE_ACTION_TERMS,
  FORBIDDEN_EVIDENCE_STATES,
} from './types'

const MAX_SUMMARY_SIZE = 50_000
const VALID_SOURCE_KINDS: readonly EvidenceSourceKind[] = [
  'user_pasted_text',
  'user_provided_file_summary',
  'user_provided_command_output_summary',
  'user_provided_external_screenshot_description',
  'user_provided_sanitized_context_snapshot',
  'manual_note',
]

const LEGACY_SOURCE_MAP: Partial<Record<EvidenceSource, EvidenceSourceKind>> = {
  github_issue: 'user_provided_sanitized_context_snapshot',
  github_pr: 'user_provided_sanitized_context_snapshot',
  ci_log: 'user_provided_command_output_summary',
  manual_json: 'user_provided_sanitized_context_snapshot',
  manual_text: 'user_pasted_text',
  manual_markdown: 'user_pasted_text',
  other: 'manual_note',
}

const SECRET_PATTERNS: readonly { name: string; pattern: RegExp }[] = [
  { name: 'api_key', pattern: /\b(api[_-]?key|secret[_-]?key)\s*[:=]\s*['"]?[a-z0-9_\-]{16,}/i },
  { name: 'bearer_token', pattern: /\bauthorization\s*[:=]\s*bearer\s+[a-z0-9._\-]+/i },
  { name: 'cookie', pattern: /\bcookie\s*[:=]\s*[^;\n]{8,}/i },
  { name: 'private_key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'raw_header', pattern: /\b(x-api-key|set-cookie)\s*:/i },
  { name: 'raw_payload_secret', pattern: /"((password|token|credential|secret|cookie))"\s*:\s*"[^"]+"/i },
]

export class EvidenceValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EvidenceValidationError'
  }
}

export class EvidenceSafetyViolationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EvidenceSafetyViolationError'
  }
}

export function normalizeEvidenceSource(source: EvidenceSource): EvidenceSourceKind {
  if ((VALID_SOURCE_KINDS as readonly string[]).includes(source)) return source as EvidenceSourceKind
  const mapped = LEGACY_SOURCE_MAP[source]
  if (!mapped) throw new EvidenceValidationError(`Invalid evidence source: "${source}".`)
  return mapped
}

export function validateUserExplicitSource(sourceKind: EvidenceSourceKind): void {
  if (!VALID_SOURCE_KINDS.includes(sourceKind)) {
    throw new EvidenceValidationError(`Invalid sourceKind: "${sourceKind}".`)
  }
}

export function metadataOnly(
  metadata: Partial<EvidenceImportSourceMetadata> = {}
): EvidenceImportSourceMetadata {
  return {
    pathHint: stringOrUndefined(metadata.pathHint),
    commandHint: stringOrUndefined(metadata.commandHint),
    urlHint: stringOrUndefined(metadata.urlHint),
    endpointHint: stringOrUndefined(metadata.endpointHint),
    mcpServerHint: stringOrUndefined(metadata.mcpServerHint),
    externalSystemName: stringOrUndefined(metadata.externalSystemName),
    screenshotDescription: stringOrUndefined(metadata.screenshotDescription),
    metadataOnly: true,
    mayDereferencePath: false,
    mayExecuteCommand: false,
    mayFetchUrl: false,
    mayCallEndpoint: false,
    mayConnectMcp: false,
  }
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function validateNoDereferenceMetadata(metadata: EvidenceImportSourceMetadata): void {
  if (metadata.metadataOnly !== true) throw new EvidenceSafetyViolationError('metadataOnly must be true.')
  if (metadata.mayDereferencePath !== false) throw new EvidenceSafetyViolationError('mayDereferencePath must be false.')
  if (metadata.mayExecuteCommand !== false) throw new EvidenceSafetyViolationError('mayExecuteCommand must be false.')
  if (metadata.mayFetchUrl !== false) throw new EvidenceSafetyViolationError('mayFetchUrl must be false.')
  if (metadata.mayCallEndpoint !== false) throw new EvidenceSafetyViolationError('mayCallEndpoint must be false.')
  if (metadata.mayConnectMcp !== false) throw new EvidenceSafetyViolationError('mayConnectMcp must be false.')
}

export function validateRawInputStorage(rawInputHandling: string): void {
  if (rawInputHandling !== 'not_stored' && rawInputHandling !== 'stored_redacted_excerpt_only') {
    throw new EvidenceSafetyViolationError('rawInputHandling must be not_stored or stored_redacted_excerpt_only.')
  }
}

export function findSensitiveContent(value: string): string[] {
  const findings: string[] = []
  for (const entry of SECRET_PATTERNS) {
    if (entry.pattern.test(value)) findings.push(entry.name)
  }
  return [...new Set(findings)]
}

export function validateNoRawSensitiveContent(value: string): string[] {
  return findSensitiveContent(value)
}

export function redactSensitiveContent(value: string): { text: string; findings: string[] } {
  const findings = findSensitiveContent(value)
  let text = value
  for (const entry of SECRET_PATTERNS) {
    text = text.replace(entry.pattern, `[REDACTED:${entry.name}]`)
  }
  return { text, findings }
}

export function summarizeUserContent(value: string, max = 2000): string {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}...`
}

export function validateEvidenceImportInput(input: CreateEvidenceImportInput): void {
  const sourceKind = normalizeEvidenceSource(input.sourceKind)
  validateUserExplicitSource(sourceKind)
  validateRequiredText(input.title, 'title', 200)
  validateRequiredText(input.userProvidedSummary, 'userProvidedSummary', MAX_SUMMARY_SIZE)
  if (input.importedContentSummary) {
    validateRequiredText(input.importedContentSummary, 'importedContentSummary', MAX_SUMMARY_SIZE)
  }
  const metadata = metadataOnly(input.sourceMetadata)
  validateNoDereferenceMetadata(metadata)
}

export function validateEvidenceSourceProfileInput(input: CreateEvidenceSourceProfileInput): void {
  validateUserExplicitSource(input.sourceKind)
  validateRequiredText(input.displayName, 'displayName', 120)
  validateRequiredText(input.description, 'description', 1000)
}

export function validateEvidenceSourceProfileSafety(profile: Pick<
  EvidenceSourceProfile,
  | 'targetSprint'
  | 'collectionMode'
  | 'mayDereferencePath'
  | 'mayReadDirectory'
  | 'mayReadClipboard'
  | 'mayExecuteCommand'
  | 'mayExecuteGit'
  | 'mayFetchUrl'
  | 'mayCallExternalApi'
  | 'mayConnectMcp'
  | 'mayReadExternalSystem'
  | 'mayWriteExternalSystem'
  | 'secretHandling'
  | 'evidenceOnly'
>): void {
  if (profile.targetSprint !== 'sprint_17') throw new EvidenceSafetyViolationError('targetSprint must be sprint_17.')
  if (profile.collectionMode !== 'manual_user_provided_only') throw new EvidenceSafetyViolationError('collectionMode must be manual_user_provided_only.')
  for (const [key, value] of Object.entries(profile)) {
    if (key.startsWith('may') && value !== false) throw new EvidenceSafetyViolationError(`${key} must be false.`)
  }
  if (profile.secretHandling !== 'reject_or_redact') throw new EvidenceSafetyViolationError('secretHandling must be reject_or_redact.')
  if (profile.evidenceOnly !== true) throw new EvidenceSafetyViolationError('evidenceOnly must be true.')
}

export function validateEvidenceRedactionPolicySafety(policy: Pick<
  EvidenceRedactionPolicy,
  | 'targetSprint'
  | 'rejectSecrets'
  | 'redactTokens'
  | 'redactCookies'
  | 'redactCredentials'
  | 'redactPrivateKeys'
  | 'redactRawHeaders'
  | 'redactRawPayloads'
  | 'allowSummariesOnly'
  | 'storeRawInput'
  | 'evidenceOnly'
>): void {
  if (policy.targetSprint !== 'sprint_17') throw new EvidenceSafetyViolationError('targetSprint must be sprint_17.')
  for (const [key, value] of Object.entries(policy)) {
    if (key === 'storeRawInput' && value !== false) throw new EvidenceSafetyViolationError('storeRawInput must be false.')
    if (key !== 'targetSprint' && key !== 'storeRawInput' && value !== true) {
      throw new EvidenceSafetyViolationError(`${key} must be true.`)
    }
  }
}

export function validateEvidenceOnlyTokenBlocker(record: {
  isExecutionToken?: boolean
  isReleaseToken?: boolean
  isDeployToken?: boolean
  isExternalAccessToken?: boolean
  isTaskCompletionToken?: boolean
  isPermissionGrant?: boolean
  evidenceOnly?: boolean
}): void {
  if (record.evidenceOnly !== true) throw new EvidenceSafetyViolationError('evidenceOnly must be true.')
  for (const key of ['isExecutionToken', 'isReleaseToken', 'isDeployToken', 'isExternalAccessToken', 'isTaskCompletionToken', 'isPermissionGrant'] as const) {
    if (record[key] === true) throw new EvidenceSafetyViolationError(`${key} must be false.`)
  }
}

export function validateEvidenceSnapshotSafety(snapshot: Pick<
  SanitizedEvidenceSnapshot,
  | 'targetSprint'
  | 'evidenceOnly'
  | 'isExecutionToken'
  | 'isPermissionGrant'
  | 'isReleaseToken'
  | 'isDeployToken'
  | 'isExternalAccessToken'
  | 'isTaskCompletionToken'
>): void {
  if (snapshot.targetSprint !== 'sprint_17') throw new EvidenceSafetyViolationError('targetSprint must be sprint_17.')
  validateEvidenceOnlyTokenBlocker(snapshot)
}

export function validateEvidenceReviewInput(input: CreateEvidenceReviewInput): void {
  if (!['evidence_source_profile', 'evidence_import_record', 'sanitized_evidence_snapshot', 'evidence_redaction_policy'].includes(input.targetType)) {
    throw new EvidenceValidationError('Invalid evidence review targetType.')
  }
  validateRequiredText(input.targetId, 'targetId', 200)
  if (!['kelvin', 'owner', 'operator'].includes(input.reviewer)) throw new EvidenceValidationError('Invalid reviewer.')
  if (!['needs_changes', 'approved_record', 'rejected'].includes(input.verdict)) throw new EvidenceValidationError('Invalid verdict.')
  validateRequiredText(input.reviewNotes, 'reviewNotes', 4000)
}

export function validateEvidenceReviewSafety(record: Pick<
  EvidenceReviewRecord,
  | 'targetSprint'
  | 'evidenceOnly'
  | 'doesNotReadFiles'
  | 'doesNotRunCommands'
  | 'doesNotRunGit'
  | 'doesNotFetchUrls'
  | 'doesNotCallExternalSystems'
  | 'doesNotConnectMcp'
  | 'doesNotExecute'
  | 'doesNotRelease'
  | 'doesNotDeploy'
  | 'doesNotCompleteTask'
>): void {
  if (record.targetSprint !== 'sprint_17') throw new EvidenceSafetyViolationError('targetSprint must be sprint_17.')
  if (record.evidenceOnly !== true) throw new EvidenceSafetyViolationError('evidenceOnly must be true.')
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith('doesNot') && value !== true) throw new EvidenceSafetyViolationError(`${key} must be true.`)
  }
}

export function validateNoForbiddenEvidenceStates(states: string[]): void {
  for (const state of states) {
    if ((FORBIDDEN_EVIDENCE_STATES as readonly string[]).includes(state)) {
      throw new EvidenceSafetyViolationError(`Forbidden evidence state "${state}".`)
    }
  }
}

export function validateNoForbiddenEvidenceActionTerms(value: string, context: string): void {
  const lower = value.toLowerCase()
  for (const term of FORBIDDEN_EVIDENCE_ACTION_TERMS) {
    if (lower.includes(term)) {
      throw new EvidenceSafetyViolationError(`Forbidden Sprint 17 action term "${term}" found in ${context}.`)
    }
  }
}

function validateRequiredText(value: unknown, name: string, max: number): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new EvidenceValidationError(`${name} is required and must be a non-empty string.`)
  }
  if (value.length > max) throw new EvidenceValidationError(`${name} must be ${max} characters or less.`)
}

export function validateCreateInput(input: CreateEvidenceInput): void {
  validateEvidenceImportInput({
    sourceKind: input.source,
    title: input.title,
    userProvidedSummary: input.content,
    importedContentSummary: input.content,
    sourceMetadata: {
      urlHint: input.sourceUrl,
      externalSystemName: input.sourceId,
    },
    createdBy: input.importedBy === 'system' ? 'operator' : 'user',
    idempotencyKey: input.idempotencyKey,
  })
}

export function computeContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16)
}

export function extractTags(content: string, title: string): string[] {
  const tags = new Set<string>()
  for (const word of title.toLowerCase().split(/\s+/)) {
    if (word.length > 3) tags.add(word)
  }
  const hashTags = content.match(/#(\w+)/g)
  if (hashTags) {
    for (const tag of hashTags) tags.add(tag.slice(1).toLowerCase())
  }
  for (const keyword of ['api', 'database', 'auth', 'security', 'performance', 'bug', 'feature', 'test', 'deploy']) {
    if (content.toLowerCase().includes(keyword)) tags.add(keyword)
  }
  return Array.from(tags).slice(0, 20)
}

