import { describe, expect, it, vi } from 'vitest'
import { createObsidianDraftPlan } from '@/lib/tools/obsidian-draft'
import { executeRegisteredTool, getToolDefinition } from '../index'

vi.mock('@/lib/tools/obsidian-draft', async () => {
  const actual = await vi.importActual<typeof import('@/lib/tools/obsidian-draft')>('@/lib/tools/obsidian-draft')
  return {
    ...actual,
    executeObsidianDraftPlan: vi.fn(async (plan, context) => ({
      id: 'draft-receipt-1',
      action: plan.action,
      status: 'succeeded',
      path: plan.targetPath,
      timestamp: '2026-06-18T00:00:00.000Z',
      executionPlanId: plan.id,
      approvedBy: context.approvedBy,
      approvalRecordId: context.approvalRecordId,
      reason: 'mock receipt',
    })),
  }
})

describe('tool registry', () => {
  it('registers and executes obsidian.write_draft with a unified receipt', async () => {
    const tool = getToolDefinition('obsidian.write_draft')
    expect(tool?.action).toBe('write_local_markdown_draft')

    const plan = createObsidianDraftPlan({
      draftTitle: 'Competitor weekly',
      filename: 'competitor-weekly.md',
      content: '# Draft',
      dryRun: false,
    }, {
      vaultPath: String.raw`D:\AI知识库`,
    })

    const receipt = await executeRegisteredTool({
      toolId: 'obsidian.write_draft',
      plan,
      context: {
        approved: true,
        approvalRecordId: 'approval-1',
        approvedBy: 'kelvin',
      },
    })

    expect(receipt.toolId).toBe('obsidian.write_draft')
    expect(receipt.action).toBe('write_local_markdown_draft')
    expect(receipt.path).toBe(plan.targetPath)
    expect(receipt.timestamp).toBe('2026-06-18T00:00:00.000Z')
    expect(receipt.approvalRecordId).toBe('approval-1')
  })
})
