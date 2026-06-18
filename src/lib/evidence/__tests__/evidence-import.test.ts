import { describe, expect, it } from 'vitest'
import {
  createEvidenceImportRecord,
  createEvidenceReviewRecord,
  deleteEvidence,
  listEvidenceImports,
  transitionEvidenceRecordStatus,
} from '../repository'
import {
  validateEvidenceOnlyTokenBlocker,
  validateNoDereferenceMetadata,
  metadataOnly,
} from '../validator'

describe('Sprint 17 evidence import records', () => {
  it('creates local draft records and sanitized snapshots only', async () => {
    const result = await createEvidenceImportRecord({
      sourceKind: 'user_pasted_text',
      title: 'Manual Evidence Summary',
      userProvidedSummary: 'Operator pasted a summary about readiness review.',
      sourceMetadata: {
        pathHint: 'D:/example/private.txt',
        commandHint: 'npm test',
        urlHint: 'https://example.invalid/schema',
        endpointHint: '/v1/private',
        mcpServerHint: 'local-mcp',
      },
      createdBy: 'user',
    })

    expect(result.record.status).toBe('draft')
    expect(result.record.rawInputHandling).toBe('not_stored')
    expect(result.record.evidenceOnly).toBe(true)
    expect(result.record.isExecutionToken).toBe(false)
    expect(result.record.isReleaseToken).toBe(false)
    expect(result.record.isDeployToken).toBe(false)
    expect(result.record.isExternalAccessToken).toBe(false)
    expect(result.record.isTaskCompletionToken).toBe(false)
    expect(result.record.mutatesSourceRecords).toBe(false)
    expect(result.snapshot.importRecordId).toBe(result.record.id)
    expect(result.snapshot.evidenceOnly).toBe(true)

    const storedMetadata = JSON.parse(result.record.sourceMetadataJson)
    expect(storedMetadata.metadataOnly).toBe(true)
    expect(storedMetadata.mayDereferencePath).toBe(false)
    expect(storedMetadata.mayExecuteCommand).toBe(false)
    expect(storedMetadata.mayFetchUrl).toBe(false)
    expect(storedMetadata.mayCallEndpoint).toBe(false)
    expect(storedMetadata.mayConnectMcp).toBe(false)
  })

  it('redacts secrets and never turns evidence into execution permission', async () => {
    const result = await createEvidenceImportRecord({
      sourceKind: 'manual_note',
      title: 'Sensitive Manual Note',
      userProvidedSummary: 'authorization: Bearer abcdefghijklmnop token should not become raw evidence.',
      createdBy: 'operator',
    })

    expect(result.record.rawInputHandling).toBe('stored_redacted_excerpt_only')
    expect(result.record.importedContentSummary).toContain('[REDACTED:bearer_token]')
    expect(result.record.importedContentSummary).not.toContain('abcdefghijklmnop')
    expect(result.snapshot.redactionStatus).toBe('redacted')
    expect(result.snapshot.rejectedSensitiveFindingsJson).toContain('bearer_token')

    expect(() => validateEvidenceOnlyTokenBlocker({
      evidenceOnly: result.snapshot.evidenceOnly,
      isExecutionToken: result.snapshot.isExecutionToken,
      isReleaseToken: result.snapshot.isReleaseToken,
      isDeployToken: result.snapshot.isDeployToken,
      isExternalAccessToken: result.snapshot.isExternalAccessToken,
      isTaskCompletionToken: result.snapshot.isTaskCompletionToken,
      isPermissionGrant: result.snapshot.isPermissionGrant,
    })).not.toThrow()
  })

  it('enforces the Sprint 17 evidence state machine', async () => {
    const result = await createEvidenceImportRecord({
      sourceKind: 'user_provided_file_summary',
      title: 'File Summary Evidence',
      userProvidedSummary: 'User supplied a summary of a local file; the system did not read the path.',
    })

    const reviewed = await transitionEvidenceRecordStatus({
      recordType: 'evidence_import_record',
      id: result.record.id,
      targetStatus: 'review',
      reason: 'Submit local evidence record for review.',
    })
    expect(reviewed.record.status).toBe('review')

    const approved = await transitionEvidenceRecordStatus({
      recordType: 'evidence_import_record',
      id: result.record.id,
      targetStatus: 'approved_record',
      reason: 'Approve local evidence record only.',
    })
    expect(approved.record.status).toBe('approved_record')

    await expect(transitionEvidenceRecordStatus({
      recordType: 'evidence_import_record',
      id: result.record.id,
      targetStatus: 'review',
      reason: 'Invalid reverse transition.',
    })).rejects.toThrow()
  })

  it('creates evidence review records that do not execute or complete tasks', async () => {
    const result = await createEvidenceImportRecord({
      sourceKind: 'user_provided_command_output_summary',
      title: 'Command Output Summary',
      userProvidedSummary: 'User pasted a command output summary; no command was run by the product.',
    })

    const review = await createEvidenceReviewRecord({
      targetType: 'evidence_import_record',
      targetId: result.record.id,
      reviewer: 'kelvin',
      verdict: 'approved_record',
      reviewNotes: 'Looks safe as sanitized evidence.',
    })

    expect(review.record.evidenceOnly).toBe(true)
    expect(review.record.doesNotReadFiles).toBe(true)
    expect(review.record.doesNotRunCommands).toBe(true)
    expect(review.record.doesNotRunGit).toBe(true)
    expect(review.record.doesNotFetchUrls).toBe(true)
    expect(review.record.doesNotCallExternalSystems).toBe(true)
    expect(review.record.doesNotConnectMcp).toBe(true)
    expect(review.record.doesNotExecute).toBe(true)
    expect(review.record.doesNotRelease).toBe(true)
    expect(review.record.doesNotDeploy).toBe(true)
    expect(review.record.doesNotCompleteTask).toBe(true)
  })

  it('keeps legacy delete compatibility as disabled, favoring archive-only APIs', async () => {
    await expect(deleteEvidence('nonexistent')).resolves.toBe(false)
  })

  it('lists local evidence imports without reading source systems', async () => {
    await createEvidenceImportRecord({
      sourceKind: 'user_provided_external_screenshot_description',
      title: 'Screenshot Description',
      userProvidedSummary: 'User described an external system screenshot.',
    })

    const records = await listEvidenceImports({ sourceKind: 'user_provided_external_screenshot_description' })
    expect(records.length).toBeGreaterThan(0)
    expect(records[0].sourceKind).toBe('user_provided_external_screenshot_description')
  })
})

describe('Sprint 17 no-dereference validation', () => {
  it('forces path / command / URL / endpoint / MCP hints to metadata-only flags', () => {
    const metadata = metadataOnly({
      pathHint: 'D:/do-not-read.txt',
      commandHint: 'git status',
      urlHint: 'https://example.invalid',
      endpointHint: '/api/private',
      mcpServerHint: 'prod-mcp',
    })

    expect(() => validateNoDereferenceMetadata(metadata)).not.toThrow()
    expect(metadata.metadataOnly).toBe(true)
    expect(metadata.mayDereferencePath).toBe(false)
    expect(metadata.mayExecuteCommand).toBe(false)
    expect(metadata.mayFetchUrl).toBe(false)
    expect(metadata.mayCallEndpoint).toBe(false)
    expect(metadata.mayConnectMcp).toBe(false)
  })
})
