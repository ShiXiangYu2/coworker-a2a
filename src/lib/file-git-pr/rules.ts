import { createHash } from 'node:crypto'
import type {
  FileChangeProposal,
  FileChangeProposalSourceType,
  FileGitPrResourceType,
  FileTargetMetadata,
  GitChangePlan,
  PatchDraft,
  PullRequestPlan,
} from './types'
import { forbiddenFileGitPrStates } from './state-machine'

const secretKeyPattern = /secret|token|password|apiKey|authorization|cookie|env/i
const blockedKeyPattern = /rawPayload|fullFileContent|fullCommandOutput|externalPayload|workspaceFileContent|shellOutput|gitOutput/i
const forbiddenActionPattern =
  /\b(apply patch|write file|format|run git|run shell|commit|push|merge|checkout|rebase|create pr|deploy|delete|auto apply|rollback|replay|retry automatically|resume execution)\b/i

export const allowedSourceTypes: FileChangeProposalSourceType[] = [
  'agent_result',
  'tool_result',
  'tool_execution_receipt',
  'collaboration_decision',
  'user_provided_snippet',
  'sanitized_context_snapshot',
]

export function stableHash(value: unknown): string {
  return createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex')
}

export function sanitizeSourceSnapshot(value: unknown): unknown {
  const blocked = findBlockedPath(value)
  if (blocked) throw new Error(`Sprint 12 source snapshot contains blocked field ${blocked}.`)
  return sanitizeValue(value)
}

export function assertPathMetadataOnly(targetFiles: FileTargetMetadata[]): void {
  if (!Array.isArray(targetFiles) || targetFiles.length === 0) {
    throw new Error('At least one target file metadata entry is required.')
  }
  for (const target of targetFiles) {
    if (!target.path || typeof target.path !== 'string') throw new Error('targetFiles.path is required.')
    if (target.pathKind !== 'metadata_only') throw new Error('targetFiles.pathKind must be metadata_only.')
    if (target.path.includes('\0')) throw new Error('targetFiles.path contains invalid characters.')
  }
}

export function assertNoForbiddenActionText(value: unknown): void {
  const text = flattenText(value)
  for (const state of forbiddenFileGitPrStates) {
    if (text.includes(state)) throw new Error(`Sprint 12 forbidden state text: ${state}`)
  }
  if (forbiddenActionPattern.test(text)) {
    throw new Error('Sprint 12 forbidden execution wording detected.')
  }
}

export function assertLocalProposalOnly(record: {
  canWriteFile?: boolean
  canRunGit?: boolean
  canCreatePr?: boolean
  canDeploy?: boolean
  canApply?: boolean
  canFormat?: boolean
  canCommit?: boolean
  canPush?: boolean
  canMerge?: boolean
  canCallExternalApi?: boolean
}): void {
  const enabled = Object.entries(record).filter(([, value]) => value === true)
  if (enabled.length > 0) {
    throw new Error(`Sprint 12 local records cannot enable execution capabilities: ${enabled.map(([key]) => key).join(', ')}`)
  }
}

export function validateFileChangeProposalDraft(input: Pick<FileChangeProposal,
  'sourceType' | 'sourceSnapshot' | 'sourceRedactionStatus' | 'targetFiles' | 'title' | 'summary' | 'rationale'
>): void {
  if (!allowedSourceTypes.includes(input.sourceType)) throw new Error('Unsupported FileChangeProposal sourceType.')
  if (input.sourceRedactionStatus === 'blocked' && input.sourceSnapshot !== undefined) {
    throw new Error('Blocked payload content must not be persisted.')
  }
  assertPathMetadataOnly(input.targetFiles)
  assertNoForbiddenActionText([input.title, input.summary, input.rationale])
}

export function validatePatchDraftDraft(input: Pick<PatchDraft,
  'targetPath' | 'targetPathKind' | 'proposedPatch' | 'sourceRedactionStatus' | 'sourceSnippet' | 'summary' | 'rationale'
>): void {
  if (input.targetPathKind !== 'metadata_only') throw new Error('PatchDraft targetPathKind must be metadata_only.')
  if (!input.targetPath) throw new Error('PatchDraft targetPath is required.')
  if (input.sourceRedactionStatus === 'blocked' && input.sourceSnippet) {
    throw new Error('Blocked sourceSnippet must not be persisted.')
  }
  assertNoForbiddenActionText([input.summary, input.rationale])
}

export function validateGitChangePlanDraft(input: Pick<GitChangePlan,
  'proposedChangedPaths' | 'proposedCommandsText' | 'sourceRedactionStatus' | 'title' | 'summary' | 'rationale'
>): void {
  if (!Array.isArray(input.proposedChangedPaths)) throw new Error('proposedChangedPaths must be an array.')
  if (input.sourceRedactionStatus === 'blocked') {
    // Blocked source is allowed as a marker only; proposed plan text must still be safe.
  }
  assertNoForbiddenActionText([input.title, input.summary, input.rationale])
}

export function validatePullRequestPlanDraft(input: Pick<PullRequestPlan,
  'title' | 'summary' | 'bodyDraft' | 'sourceRedactionStatus'
>): void {
  if (input.sourceRedactionStatus === 'blocked') {
    // Blocked source is allowed as a marker only; PR plan text must still be safe.
  }
  assertNoForbiddenActionText([input.title, input.summary])
}

export function eventTypeForResource(resourceType: FileGitPrResourceType, status: string): string {
  if (resourceType === 'file_change_proposal') return status === 'proposal' ? 'file_change.proposal_created' : `file_change.${status}`
  if (resourceType === 'patch_draft') return status === 'proposal' ? 'patch_draft.created' : `patch_draft.${status}`
  if (resourceType === 'git_change_plan') return status === 'proposal' ? 'git_change_plan.created' : `git_change_plan.${status}`
  if (resourceType === 'pull_request_plan') return status === 'proposal' ? 'pull_request_plan.created' : `pull_request_plan.${status}`
  return status === 'proposal' ? 'review_patch_record.created' : `review_patch_record.${status}`
}

function findBlockedPath(value: unknown, path = '$'): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findBlockedPath(value[index], `${path}[${index}]`)
      if (found) return found
    }
    return undefined
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`
    if (blockedKeyPattern.test(key)) return childPath
    const found = findBlockedPath(child, childPath)
    if (found) return found
  }
  return undefined
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' && value.length > 1200 ? `${value.slice(0, 1200)}...` : value
  }
  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    out[key] = secretKeyPattern.test(key) ? '[REDACTED]' : sanitizeValue(child)
  }
  return out
}

function flattenText(value: unknown): string {
  if (typeof value === 'string') return value.toLowerCase()
  if (Array.isArray(value)) return value.map(flattenText).join('\n')
  if (value && typeof value === 'object') return Object.values(value).map(flattenText).join('\n')
  return ''
}
