import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runExecutionRuntime } from '../index'
import { executeRegisteredTool } from '@/lib/tool-registry'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    runtimeExecutionRecord: {
      create: vi.fn(async ({ data }) => ({
        id: 'runtime-record-1',
        ...data,
        createdAt: new Date('2026-06-19T00:00:00.000Z'),
        updatedAt: new Date('2026-06-19T00:00:00.000Z'),
      })),
      update: vi.fn(async ({ where, data }) => ({
        id: where.id,
        ...data,
        updatedAt: new Date('2026-06-19T00:00:00.000Z'),
      })),
    },
  },
}))

vi.mock('@/lib/tool-registry', async () => {
  const actual = await vi.importActual<typeof import('@/lib/tool-registry')>('@/lib/tool-registry')
  return {
    ...actual,
    executeRegisteredTool: vi.fn(async ({ toolId, plan, context }) => ({
      id: 'tool-receipt-1',
      toolId,
      action: plan.action,
      status: 'succeeded',
      path: plan.targetPath,
      timestamp: '2026-06-19T00:00:00.000Z',
      executionPlanId: plan.id,
      approvalRecordId: context.approvalRecordId,
      approvedBy: context.approvedBy,
      reason: 'Kelvin-approved tool execution succeeded.',
    })),
  }
})

describe('execution runtime', () => {
  const auditWriter = vi.fn(async () => undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not call Tool Registry when policy does not allow controlled execution', async () => {
    const result = await runExecutionRuntime({
      toolId: 'obsidian.write_draft',
      riskLevel: 'medium',
      plan: {
        id: 'plan-1',
        action: 'write_local_markdown_draft',
        targetPath: String.raw`D:\AI知识库\Inbox\AI Drafts\demo.md`,
        targetDirectory: String.raw`D:\AI知识库\Inbox\AI Drafts`,
        dryRun: false,
      },
      approval: {
        approved: false,
      },
      policyInput: {
        action: 'write_local_markdown_draft',
        targetPath: String.raw`D:\AI知识库\Inbox\AI Drafts\demo.md`,
        allowedDirectory: String.raw`D:\AI知识库\Inbox\AI Drafts`,
        dryRun: false,
        allowOverwrite: false,
      },
      auditWriter,
      now: new Date('2026-06-19T00:00:00.000Z'),
    })

    expect(result.executed).toBe(false)
    expect(result.runtimeRecordId).toBe('runtime-record-1')
    expect(result.policyResult.decision).toBe('requires_kelvin_approval')
    expect(result.receipt.toolId).toBe('obsidian.write_draft')
    expect(result.receipt.status).toBe('denied')
    expect(executeRegisteredTool).not.toHaveBeenCalled()
    expect(prisma.runtimeExecutionRecord.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'policy_checked',
        policyDecision: 'requires_kelvin_approval',
      }),
    }))
    expect(prisma.runtimeExecutionRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'runtime-record-1' },
      data: expect.objectContaining({
        status: 'denied',
      }),
    }))
    expect(auditWriter).toHaveBeenCalledTimes(2)
    expect(auditWriter).toHaveBeenNthCalledWith(1, expect.objectContaining({ eventType: 'policy_checked' }))
    expect(auditWriter).toHaveBeenNthCalledWith(2, expect.objectContaining({ eventType: 'tool_execution_withheld' }))
  })

  it('calls Tool Registry when policy allows controlled execution', async () => {
    const result = await runExecutionRuntime({
      toolId: 'obsidian.write_draft',
      riskLevel: 'medium',
      plan: {
        id: 'plan-1',
        action: 'write_local_markdown_draft',
        targetPath: String.raw`D:\AI知识库\Inbox\AI Drafts\demo.md`,
        targetDirectory: String.raw`D:\AI知识库\Inbox\AI Drafts`,
        dryRun: false,
      },
      approval: {
        approved: true,
        approvalRecordId: 'approval-1',
        approvedBy: 'kelvin',
      },
      policyInput: {
        action: 'write_local_markdown_draft',
        targetPath: String.raw`D:\AI知识库\Inbox\AI Drafts\demo.md`,
        allowedDirectory: String.raw`D:\AI知识库\Inbox\AI Drafts`,
        dryRun: false,
        allowOverwrite: false,
      },
      auditWriter,
      now: new Date('2026-06-19T00:00:00.000Z'),
    })

    expect(result.executed).toBe(true)
    expect(result.runtimeRecordId).toBe('runtime-record-1')
    expect(result.policyResult.decision).toBe('allow_controlled_execution')
    expect(result.receipt.toolId).toBe('obsidian.write_draft')
    expect(result.receipt.action).toBe('write_local_markdown_draft')
    expect(result.receipt.path).toContain('Inbox')
    expect(result.receipt.timestamp).toBe('2026-06-19T00:00:00.000Z')
    expect(result.receipt.approvalRecordId).toBe('approval-1')
    expect(executeRegisteredTool).toHaveBeenCalledTimes(1)
    expect(prisma.runtimeExecutionRecord.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'policy_checked',
        policyDecision: 'allow_controlled_execution',
      }),
    }))
    expect(prisma.runtimeExecutionRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'runtime-record-1' },
      data: expect.objectContaining({
        status: 'succeeded',
        approvalRecordId: 'approval-1',
      }),
    }))
    expect(auditWriter).toHaveBeenCalledTimes(2)
    expect(auditWriter).toHaveBeenNthCalledWith(1, expect.objectContaining({ eventType: 'policy_checked' }))
    expect(auditWriter).toHaveBeenNthCalledWith(2, expect.objectContaining({ eventType: 'tool_execution_completed' }))
  })
})
