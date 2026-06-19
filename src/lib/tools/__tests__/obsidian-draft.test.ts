import * as fsPromises from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createObsidianDraftPlan, executeObsidianDraftPlan } from '../obsidian-draft'

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}))

describe('obsidian draft tool', () => {
  beforeEach(() => {
    vi.mocked(fsPromises.access).mockRejectedValue(new Error('missing'))
    vi.mocked(fsPromises.mkdir).mockClear()
    vi.mocked(fsPromises.writeFile).mockClear()
  })

  it('does not create a Markdown draft without Kelvin approval', async () => {
    const plan = createObsidianDraftPlan({
      draftTitle: 'Competitor weekly',
      filename: 'competitor-weekly.md',
      content: '# Draft',
      dryRun: false,
    }, {
      vaultPath: String.raw`D:\AI知识库`,
    })

    const receipt = await executeObsidianDraftPlan(plan, {
      approved: false,
    })

    expect(receipt.status).toBe('denied')
    expect(receipt.action).toBe('write_local_markdown_draft')
    expect(receipt.path).toContain(String.raw`D:\AI知识库`)
    expect(receipt.path).toContain('Inbox')
    expect(receipt.path).toContain('AI Drafts')
    expect(receipt.timestamp).toBeTruthy()
    expect(fsPromises.access).not.toHaveBeenCalled()
    expect(fsPromises.mkdir).not.toHaveBeenCalled()
    expect(fsPromises.writeFile).not.toHaveBeenCalled()
  })

  it('creates a Markdown draft inside the vault draft directory after Kelvin approval', async () => {
    const plan = createObsidianDraftPlan({
      draftTitle: 'Competitor weekly',
      filename: 'competitor-weekly.md',
      content: '# Draft',
      dryRun: false,
    }, {
      vaultPath: String.raw`D:\AI知识库`,
    })

    const receipt = await executeObsidianDraftPlan(plan, {
      approved: true,
      approvalRecordId: 'approval-1',
      approvedBy: 'kelvin',
    })

    expect(receipt.status).toBe('succeeded')
    expect(receipt.action).toBe('write_local_markdown_draft')
    expect(receipt.path).toBe(plan.targetPath)
    expect(receipt.path).toContain(String.raw`D:\AI知识库`)
    expect(receipt.path).toContain('Inbox')
    expect(receipt.path).toContain('AI Drafts')
    expect(receipt.timestamp).toBeTruthy()
    expect(receipt.approvalRecordId).toBe('approval-1')
    expect(fsPromises.mkdir).toHaveBeenCalledWith(plan.targetDirectory, { recursive: true })
    expect(fsPromises.writeFile).toHaveBeenCalledWith(plan.targetPath, '# Draft', 'utf8')
  })

  it('does not allow draft filenames to escape the vault draft directory', () => {
    expect(() => createObsidianDraftPlan({
      draftTitle: 'Escape',
      filename: '../escape.md',
      content: '# Escape',
      dryRun: true,
    }, {
      vaultPath: String.raw`D:\AI知识库`,
    })).toThrow('Invalid Obsidian draft filename.')
  })

  it('does not overwrite an existing draft by default', async () => {
    vi.mocked(fsPromises.access).mockResolvedValueOnce(undefined)
    const plan = createObsidianDraftPlan({
      draftTitle: 'Competitor weekly',
      filename: 'competitor-weekly.md',
      content: '# Draft',
      dryRun: false,
    }, {
      now: new Date('2026-06-18T00:00:00.000Z'),
      vaultPath: String.raw`D:\AI知识库`,
    })

    const receipt = await executeObsidianDraftPlan(plan, {
      approved: true,
      approvalRecordId: 'approval-1',
      approvedBy: 'kelvin',
      now: new Date('2026-06-18T12:34:56.000Z'),
    })

    expect(receipt.status).toBe('succeeded')
    expect(receipt.path).not.toBe(plan.targetPath)
    expect(receipt.path).toContain('competitor-weekly-20260618-123456Z.md')
    expect(fsPromises.writeFile).toHaveBeenCalledWith(receipt.path, '# Draft', 'utf8')
  })
})
