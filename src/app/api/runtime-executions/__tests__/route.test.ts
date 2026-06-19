import { describe, expect, it, vi } from 'vitest'
import { GET } from '../route'
import {
  listRecentRuntimeExecutionRecords,
  listRuntimeExecutionRecordsByCorrelationId,
} from '@/lib/execution-runtime/repository'

vi.mock('@/lib/execution-runtime/repository', () => ({
  listRuntimeExecutionRecordsByCorrelationId: vi.fn(async () => [
    {
      id: 'runtime-1',
      correlationId: 'corr-1',
      toolId: 'obsidian.write_draft',
      action: 'write_local_markdown_draft',
      status: 'dry_run',
      policyDecision: 'allow_dry_run',
      targetPath: 'D:\\AI知识库\\Inbox\\AI Drafts\\demo.md',
      approvalRecordId: null,
      executionPlanId: 'plan-1',
      createdAt: '2026-06-19T00:00:00.000Z',
      updatedAt: '2026-06-19T00:01:00.000Z',
    },
  ]),
  listRecentRuntimeExecutionRecords: vi.fn(async () => []),
}))

describe('/api/runtime-executions', () => {
  it('returns runtime execution records by correlation id', async () => {
    const response = await GET(new Request('http://localhost/api/runtime-executions?correlationId=corr-1&limit=5'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data[0]).toMatchObject({
      id: 'runtime-1',
      toolId: 'obsidian.write_draft',
      policyDecision: 'allow_dry_run',
    })
    expect(body.data[0]).not.toHaveProperty('receiptJson')
    expect(listRuntimeExecutionRecordsByCorrelationId).toHaveBeenCalledWith({
      correlationId: 'corr-1',
      limit: 5,
    })
  })

  it('returns recent runtime executions when correlation id is absent', async () => {
    await GET(new Request('http://localhost/api/runtime-executions?limit=2'))

    expect(listRecentRuntimeExecutionRecords).toHaveBeenCalledWith({ limit: 2 })
  })
})
