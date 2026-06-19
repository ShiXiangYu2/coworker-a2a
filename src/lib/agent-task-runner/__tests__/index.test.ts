import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { runAgentTask, runRecordedAgentTask } from '../index'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    agentTaskRunRecord: {
      create: vi.fn(async ({ data }) => ({
        id: 'agent-task-run-record-1',
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

describe('agent task runner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs research and content tasks sequentially for competitor weekly', async () => {
    const research = await runAgentTask({
      id: 'research-1',
      agentId: 'research.agent',
      type: 'research_competitor_evidence',
      title: 'Research',
    }, {
      userMessage: 'Create a competitor weekly draft.',
    })

    expect(research.kind).toBe('research_summary')
    if (research.kind !== 'research_summary') throw new Error('Expected research summary')
    expect(research.researchSummary.length).toBeGreaterThan(0)
    expect(research.evidence.length).toBeGreaterThan(0)

    const content = await runAgentTask({
      id: 'content-1',
      agentId: 'content.agent',
      type: 'compose_weekly_markdown',
      title: 'Content',
      dependsOn: ['research-1'],
    }, {
      userMessage: 'Create a competitor weekly draft.',
      researchSummary: research.researchSummary,
    })

    expect(content.kind).toBe('markdown_draft')
    if (content.kind !== 'markdown_draft') throw new Error('Expected markdown draft')
    expect(content.markdownDraft).toContain('# Competitor Weekly Draft')
    expect(content.markdownDraft).toContain('Notion AI')
  })

  it('creates and completes an AgentTaskRunRecord for research/content tasks', async () => {
    const research = await runRecordedAgentTask({
      task: {
        id: 'research-1',
        agentId: 'research.agent',
        type: 'research_competitor_evidence',
        title: 'Research',
      },
      orchestrator: 'elon',
      correlationId: 'corr-1',
      context: {
        userMessage: 'Create a competitor weekly draft.',
      },
      now: new Date('2026-06-19T00:00:00.000Z'),
    })

    expect(research.agentTaskRunRecordId).toBe('agent-task-run-record-1')
    expect(prisma.agentTaskRunRecord.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'started',
        orchestrator: 'elon',
        agentId: 'research.agent',
        taskType: 'research_competitor_evidence',
      }),
    }))
    expect(prisma.agentTaskRunRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'agent-task-run-record-1' },
      data: expect.objectContaining({
        status: 'completed',
        completedAt: new Date('2026-06-19T00:00:00.000Z'),
      }),
    }))

    await runRecordedAgentTask({
      task: {
        id: 'content-1',
        agentId: 'content.agent',
        type: 'compose_weekly_markdown',
        title: 'Content',
      },
      orchestrator: 'elon',
      correlationId: 'corr-1',
      context: {
        userMessage: 'Create a competitor weekly draft.',
        researchSummary: research.kind === 'research_summary' ? research.researchSummary : [],
      },
      now: new Date('2026-06-19T00:00:00.000Z'),
    })

    expect(prisma.agentTaskRunRecord.create).toHaveBeenCalledTimes(2)
  })

  it('records failed AgentTaskRunRecord updates when a task throws', async () => {
    await expect(runRecordedAgentTask({
      task: {
        id: 'invalid-1',
        agentId: 'research.agent',
        type: 'compose_weekly_markdown',
        title: 'Broken task',
      },
      orchestrator: 'elon',
      correlationId: 'corr-2',
      context: {
        userMessage: 'Create a competitor weekly draft.',
      },
      now: new Date('2026-06-19T00:00:00.000Z'),
    })).rejects.toThrow('No agent task runner registered')

    expect(prisma.agentTaskRunRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'agent-task-run-record-1' },
      data: expect.objectContaining({
        status: 'failed',
        errorJson: expect.any(String),
      }),
    }))
  })
})
