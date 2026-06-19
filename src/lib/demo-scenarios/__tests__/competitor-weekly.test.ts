import { beforeEach, describe, expect, it, vi } from 'vitest'
import { executeRegisteredTool } from '@/lib/tool-registry'
import { runCompetitorWeeklyDemo } from '../competitor-weekly'

vi.mock('@/lib/prisma', () => {
  let auditCounter = 0
  let agentTaskRunCounter = 0
  const events: Array<{
    id: string
    correlationId: string
    eventType: string
    actorType: string
    reason: string
    payloadJson: string | null
    createdAt: Date
  }> = []

  return {
    prisma: {
      runRequestRecord: {
        create: vi.fn(async ({ data }) => ({
          id: 'run-request-1',
          ...data,
          createdAt: new Date('2026-06-18T00:00:00.000Z'),
          updatedAt: new Date('2026-06-18T00:00:00.000Z'),
        })),
        update: vi.fn(async ({ where, data }) => ({
          id: 'run-request-1',
          correlationId: where.correlationId,
          source: 'demo.competitor_weekly',
          userMessage: 'mock user message',
          orchestrator: 'elon',
          metadataJson: '{}',
          startedAt: new Date('2026-06-18T00:00:00.000Z'),
          createdAt: new Date('2026-06-18T00:00:00.000Z'),
          updatedAt: new Date('2026-06-18T00:00:00.000Z'),
          ...data,
        })),
      },
      harmonyAuditEvent: {
        create: vi.fn(async ({ data }) => {
          const event = {
            id: `audit-${++auditCounter}`,
            correlationId: data.correlationId,
            eventType: data.eventType,
            actorType: data.actorType,
            reason: data.reason,
            payloadJson: data.payloadJson ?? null,
            createdAt: new Date(1_700_000_000_000 + auditCounter),
          }
          events.push(event)
          return event
        }),
        findMany: vi.fn(async ({ where }) => events.filter((event) => event.correlationId === where.correlationId)),
      },
      runtimeExecutionRecord: {
        create: vi.fn(async ({ data }) => ({
          id: 'runtime-record-1',
          ...data,
          createdAt: new Date('2026-06-18T00:00:00.000Z'),
          updatedAt: new Date('2026-06-18T00:00:00.000Z'),
        })),
        update: vi.fn(async ({ where, data }) => ({
          id: where.id,
          ...data,
          updatedAt: new Date('2026-06-18T00:00:00.000Z'),
        })),
      },
      agentTaskRunRecord: {
        create: vi.fn(async ({ data }) => ({
          id: `agent-task-run-record-${++agentTaskRunCounter}`,
          ...data,
          createdAt: new Date('2026-06-18T00:00:00.000Z'),
          updatedAt: new Date('2026-06-18T00:00:00.000Z'),
        })),
        update: vi.fn(async ({ where, data }) => ({
          id: where.id,
          ...data,
          updatedAt: new Date('2026-06-18T00:00:00.000Z'),
        })),
      },
    },
  }
})

vi.mock('@/lib/execution-gateway', () => {
  let counter = 0

  return {
    createExecutionIntent: vi.fn(async (input) => ({
      record: {
        id: `intent-${++counter}`,
        correlationId: input.correlationId,
      },
      auditEvent: {},
      safetyNote: 'mock',
    })),
    createExecutionPlan: vi.fn(async (input) => ({
      record: {
        id: `plan-${++counter}`,
        correlationId: input.correlationId,
      },
      auditEvent: {},
      safetyNote: 'mock',
    })),
    createExecutionGate: vi.fn(async (input) => ({
      record: {
        id: `gate-${++counter}`,
        correlationId: input.correlationId,
      },
      auditEvent: {},
      safetyNote: 'mock',
    })),
    createExecutionApproval: vi.fn(async (input) => ({
      record: {
        id: `approval-${++counter}`,
        correlationId: input.correlationId,
      },
      auditEvent: {},
      safetyNote: 'mock',
    })),
    transitionExecutionGatewayRecord: vi.fn(async (input) => ({
      record: {
        id: input.id,
        status: input.targetStatus,
      },
      auditEvent: {},
      safetyNote: 'mock',
    })),
    getExecutionIntentTimeline: vi.fn(async () => []),
  }
})

vi.mock('@/lib/tool-registry', () => ({
  obsidianWriteDraftTool: {
    id: 'obsidian.write_draft',
    action: 'write_local_markdown_draft',
    riskLevel: 'medium',
  },
  executeRegisteredTool: vi.fn(async ({ toolId, plan, context }) => ({
    id: 'tool-receipt-1',
    toolId,
    action: plan.action,
    status: 'succeeded',
    path: plan.targetPath,
    timestamp: '2026-06-18T00:00:00.000Z',
    executionPlanId: plan.id,
    approvedBy: context.approvedBy,
    approvalRecordId: context.approvalRecordId,
    reason: 'Kelvin-approved tool execution succeeded.',
  })),
}))

describe('competitor weekly demo scenario', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the vault draft withheld before Kelvin approval and does not execute the registry tool', async () => {
    const result = await runCompetitorWeeklyDemo({
      conversationId: 'conversation-1',
      userMessage: '帮我把今天的竞品资料整理成周报草稿',
      approved: false,
    })

    expect(result.markdownPath).toBeUndefined()
    expect(result.correlationId).toMatch(/^demo-competitor-weekly-/)
    expect(result.runRequestRecordId).toBe('run-request-1')
    expect(result.receipt.status).toBe('dry_run')
    expect(result.runtimeRecordId).toBe('runtime-record-1')
    expect(result.receipt.toolId).toBe('obsidian.write_draft')
    expect(result.receipt.action).toBe('write_local_markdown_draft')
    expect(result.toolExecution.policyDecision).toBe('allow_dry_run')
    expect(result.executionGateway.approvalRecordId).toBeUndefined()
    expect(result.taskBundle.orchestrator).toBe('elon')
    expect(result.taskBundle.tasks).toHaveLength(2)
    expect(result.taskBundle.tasks[0]?.agent).toBe('research.agent')
    expect(result.taskBundle.tasks[1]?.agent).toBe('content.agent')
    expect(result.agentTaskRunRecordIds).toEqual([
      'agent-task-run-record-1',
      'agent-task-run-record-2',
    ])
    expect(result.taskBundle.tasks[0]?.agentTaskRunRecordId).toBe('agent-task-run-record-1')
    expect(result.taskBundle.tasks[1]?.agentTaskRunRecordId).toBe('agent-task-run-record-2')
    expect(executeRegisteredTool).not.toHaveBeenCalled()

    const eventTypes = result.timeline.map((event) => event.eventType)
    expect(eventTypes).toEqual(expect.arrayContaining([
      'demo_scenario.request_received',
      'demo_scenario.orchestrator.task_planned',
      'demo_scenario.agent_task.started',
      'demo_scenario.agent_task.completed',
      'demo_scenario.execution_plan_created',
      'demo_scenario.awaiting_approval',
      'demo_scenario.policy_checked',
      'demo_scenario.local_draft_withheld',
    ]))
  })

  it('executes obsidian.write_draft through the registry after Kelvin approval', async () => {
    const result = await runCompetitorWeeklyDemo({
      userMessage: '帮我把今天的竞品资料整理成周报草稿',
      approved: true,
    })

    expect(result.receipt.status).toBe('succeeded')
    expect(result.runRequestRecordId).toBe('run-request-1')
    expect(result.runtimeRecordId).toBe('runtime-record-1')
    expect(result.receipt.toolId).toBe('obsidian.write_draft')
    expect(result.receipt.path).toContain('Inbox')
    expect(result.receipt.path).toContain('AI Drafts')
    expect(result.receipt.timestamp).toBe('2026-06-18T00:00:00.000Z')
    expect(result.receipt.action).toBe('write_local_markdown_draft')
    expect(result.receipt.approvalRecordId).toBeTruthy()
    expect(result.toolExecution.policyDecision).toBe('allow_controlled_execution')
    expect(result.executionGateway.approvalRecordId).toBeTruthy()
    expect(result.taskBundle.orchestrator).toBe('elon')
    expect(result.taskBundle.tasks).toHaveLength(2)
    expect(result.agentTaskRunRecordIds).toHaveLength(2)
    expect(result.markdownPath).toBe(result.receipt.path)
    expect(executeRegisteredTool).toHaveBeenCalledWith(expect.objectContaining({
      toolId: 'obsidian.write_draft',
    }))
    expect(result.timeline.map((event) => event.eventType)).toContain('demo_scenario.vault_draft_created')
  })
})
