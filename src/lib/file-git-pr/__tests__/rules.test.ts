import { describe, expect, it } from 'vitest'
import {
  assertLocalProposalOnly,
  assertPathMetadataOnly,
  sanitizeSourceSnapshot,
  validateFileChangeProposalDraft,
  validateGitChangePlanDraft,
  validatePatchDraftDraft,
  validatePullRequestPlanDraft,
} from '../rules'

describe('Sprint 12 File / Git / PR rules', () => {
  it('requires target paths to remain metadata only', () => {
    expect(() => assertPathMetadataOnly([
      { path: 'src/example.ts', pathKind: 'metadata_only', changeIntent: 'modify', riskLevel: 'medium' },
    ])).not.toThrow()

    expect(() => assertPathMetadataOnly([
      { path: 'src/example.ts', pathKind: 'read' as never, changeIntent: 'modify', riskLevel: 'medium' },
    ])).toThrow()
  })

  it('redacts secrets and blocks raw file or command payloads', () => {
    expect(sanitizeSourceSnapshot({ token: 'abc', summary: 'ok' })).toEqual({ token: '[REDACTED]', summary: 'ok' })
    expect(() => sanitizeSourceSnapshot({ fullFileContent: 'secret source' })).toThrow()
    expect(() => sanitizeSourceSnapshot({ fullCommandOutput: 'git status' })).toThrow()
  })

  it('keeps ToolResult and ToolExecutionReceipt evidence non-executing', () => {
    expect(() => validateFileChangeProposalDraft({
      sourceType: 'tool_execution_receipt',
      sourceSnapshot: { receiptId: 'receipt_1', sideEffects: [] },
      sourceRedactionStatus: 'not_required',
      targetFiles: [{ path: 'metadata-only', pathKind: 'metadata_only', changeIntent: 'other', riskLevel: 'medium' }],
      title: 'Evidence proposal',
      summary: 'Sanitized receipt evidence only.',
      rationale: 'Does not authorize File / Git / PR execution.',
    })).not.toThrow()
  })

  it('rejects enabled execution capabilities', () => {
    expect(() => assertLocalProposalOnly({ canWriteFile: true })).toThrow()
    expect(() => assertLocalProposalOnly({ canRunGit: true })).toThrow()
    expect(() => assertLocalProposalOnly({ canCreatePr: true })).toThrow()
  })

  it('prevents PatchDraft, GitChangePlan, and PullRequestPlan execution wording', () => {
    expect(() => validatePatchDraftDraft({
      targetPath: 'metadata-only',
      targetPathKind: 'metadata_only',
      proposedPatch: '--- a/file\n+++ b/file',
      sourceRedactionStatus: 'not_required',
      summary: 'Patch draft record',
      rationale: 'Review evidence only.',
    })).not.toThrow()

    expect(() => validateGitChangePlanDraft({
      proposedChangedPaths: ['metadata-only'],
      proposedCommandsText: 'git command text for human review only',
      sourceRedactionStatus: 'not_required',
      title: 'Run Git now',
      summary: 'Unsafe',
      rationale: 'Unsafe',
    })).toThrow()

    expect(() => validatePullRequestPlanDraft({
      title: 'Create PR',
      summary: 'Unsafe',
      bodyDraft: 'Proposal only',
      sourceRedactionStatus: 'not_required',
    })).toThrow()
  })
})
