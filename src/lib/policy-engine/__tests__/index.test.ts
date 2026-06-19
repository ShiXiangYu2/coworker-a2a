import { describe, expect, it } from 'vitest'
import { checkExecutionPolicy } from '../index'

describe('policy engine', () => {
  it('allows dry runs inside the allowed directory without approval', () => {
    const result = checkExecutionPolicy({
      toolId: 'obsidian.write_draft',
      action: 'write_local_markdown_draft',
      riskLevel: 'medium',
      targetPath: String.raw`D:\AI知识库\Inbox\AI Drafts\demo.md`,
      allowedDirectory: String.raw`D:\AI知识库\Inbox\AI Drafts`,
      dryRun: true,
      approved: false,
      allowOverwrite: false,
    })

    expect(result.decision).toBe('allow_dry_run')
    expect(result.allowed).toBe(true)
  })

  it('rejects paths outside the vault allowlist', () => {
    const result = checkExecutionPolicy({
      toolId: 'obsidian.write_draft',
      action: 'write_local_markdown_draft',
      riskLevel: 'medium',
      targetPath: String.raw`D:\AI知识库\Other\escape.md`,
      allowedDirectory: String.raw`D:\AI知识库\Inbox\AI Drafts`,
      dryRun: false,
      approved: true,
      approvalRecordId: 'approval-1',
      allowOverwrite: false,
    })

    expect(result.decision).toBe('deny')
    expect(result.allowed).toBe(false)
  })

  it('requires Kelvin approval for controlled execution', () => {
    const result = checkExecutionPolicy({
      toolId: 'obsidian.write_draft',
      action: 'write_local_markdown_draft',
      riskLevel: 'medium',
      targetPath: String.raw`D:\AI知识库\Inbox\AI Drafts\demo.md`,
      allowedDirectory: String.raw`D:\AI知识库\Inbox\AI Drafts`,
      dryRun: false,
      approved: false,
      allowOverwrite: false,
    })

    expect(result.decision).toBe('requires_kelvin_approval')
    expect(result.allowed).toBe(false)
  })
})
