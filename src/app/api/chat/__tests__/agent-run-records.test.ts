import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'

const routeState = vi.hoisted(() => ({
  mode: 'single' as 'single' | 'multi' | 'failed',
}))

const llmState = vi.hoisted(() => ({
  mode: 'normal' as 'normal' | 'tool_request',
}))

vi.mock('@/lib/llm', () => ({
  getLLMProvider: vi.fn(() => ({
    name: 'test-llm',
    async *streamChat() {
      yield { type: 'delta', content: 'test stream response' }
    },
    async chat(_messages: unknown, _systemPrompt: string, options?: { tools?: Array<{ name: string }> }) {
      if (llmState.mode === 'tool_request' && options?.tools?.length) {
        return {
          content: '',
          toolUse: {
            name: 'use_tool',
            input: {
              toolName: 'write_file',
              input: {
                path: 'blocked.md',
                content: 'blocked',
              },
            },
          },
          stopReason: 'tool_use',
        }
      }

      if (options?.tools?.some((tool) => tool.name === 'produce_deliverable')) {
        return {
          content: '',
          toolUse: {
            name: 'produce_deliverable',
            input: {
              summary: 'Recorded test deliverable.',
              confidence: 0.9,
              deliverables: [],
              nextRecommendedAction: 'show_result',
              nextReason: 'Test completed.',
            },
          },
          stopReason: 'tool_use',
        }
      }

      return {
        content: 'Recorded test response.',
        stopReason: 'end_turn',
      }
    },
  })),
}))

vi.mock('@/lib/tools/executor', () => ({
  executeToolCall: vi.fn(async () => ({
    success: true,
    output: 'should not run',
    durationMs: 1,
  })),
}))

vi.mock('@/lib/agents/llm-router', async () => {
  const actual = await vi.importActual<typeof import('@/lib/agents/llm-router')>(
    '@/lib/agents/llm-router'
  )

  return {
    ...actual,
    routeMessageLLM: vi.fn(async () => {
      if (routeState.mode === 'multi') {
        return {
          status: 'ready',
          decisionType: 'delegate_to_agent',
          targetAgentId: 'jobs',
          confidence: 0.9,
          reason: 'Test multi-agent route.',
          matchedSignals: ['jobs', 'linus'],
          requiresHumanConfirmation: false,
          next: {
            recommendedAction: 'show_route_suggestion',
            reason: 'Test multi-agent route.',
          },
          sideEffects: {
            filesChanged: [],
            branchesCreated: [],
            prsCreated: [],
            issuesUpdated: [],
          },
          decomposition: {
            reasoning: 'Split into product and engineering review.',
            subtasks: [
              {
                agentId: 'jobs',
                title: 'Product review',
                description: 'Review product implications.',
                dependsOn: [],
              },
              {
                agentId: 'linus',
                title: 'Engineering review',
                description: 'Review engineering implications.',
                dependsOn: [0],
              },
            ],
          },
        }
      }

      return {
        status: 'ready',
        decisionType: 'delegate_to_agent',
        targetAgentId: routeState.mode === 'failed' ? 'unknown_agent' : 'jobs',
        confidence: 0.9,
        reason: 'Test single-agent route.',
        matchedSignals: ['jobs'],
        requiresHumanConfirmation: false,
        next: {
          recommendedAction: 'show_route_suggestion',
          reason: 'Test single-agent route.',
        },
        sideEffects: {
          filesChanged: [],
          branchesCreated: [],
          prsCreated: [],
          issuesUpdated: [],
        },
      }
    }),
  }
})

const { POST } = await import('../route')
const { executeToolCall } = await import('@/lib/tools/executor')

const testPrefix = `agent-run-records-${Date.now()}-${Math.random().toString(36).slice(2)}`

async function cleanupTestData() {
  const runRecords = await prisma.runRequestRecord.findMany({
    where: { userMessage: { startsWith: testPrefix } },
    select: { correlationId: true },
  })
  const correlationIds = runRecords.map((record) => record.correlationId)

  if (correlationIds.length > 0) {
    await prisma.harmonyAuditEvent.deleteMany({
      where: { correlationId: { in: correlationIds } },
    })
    await prisma.agentTaskRunRecord.deleteMany({
      where: { correlationId: { in: correlationIds } },
    })
    await prisma.runRequestRecord.deleteMany({
      where: { correlationId: { in: correlationIds } },
    })
  }

  await prisma.memoryEntry.deleteMany({
    where: { title: { startsWith: testPrefix } },
  })
  await prisma.deliverable.deleteMany({
    where: { conversation: { title: { startsWith: testPrefix } } },
  })
  await prisma.message.deleteMany({
    where: { conversation: { title: { startsWith: testPrefix } } },
  })
  await prisma.conversation.deleteMany({
    where: { title: { startsWith: testPrefix } },
  })
}

async function postChat(message: string) {
  return POST(
    new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }) as never
  )
}

async function getRunCorrelationId(userMessage: string) {
  const runRecord = await prisma.runRequestRecord.findFirst({
    where: {
      source: 'chathub',
      userMessage,
    },
    orderBy: { createdAt: 'desc' },
  })

  expect(runRecord).toBeTruthy()
  return runRecord?.correlationId ?? ''
}

beforeEach(async () => {
  routeState.mode = 'single'
  llmState.mode = 'normal'
  vi.mocked(executeToolCall).mockClear()
  await cleanupTestData()
})

afterEach(cleanupTestData)

describe('ChatHub agent task run records', () => {
  it('records AgentTaskRunRecord for the single-agent route', async () => {
    routeState.mode = 'single'
    const message = `${testPrefix} single agent`

    const response = await postChat(message)
    const text = await response.text()
    const correlationId = await getRunCorrelationId(message)
    const records = await prisma.agentTaskRunRecord.findMany({
      where: { correlationId },
      orderBy: { createdAt: 'asc' },
    })

    expect(response.status).toBe(200)
    expect(text).toContain('"type":"agent_result"')
    expect(text).toContain('"agentTaskRunRecordId":"')
    expect(records).toHaveLength(1)
    expect(records[0]?.taskType).toBe('chat_single_agent')
    expect(records[0]?.status).toBe('completed')
    expect(records[0]?.outputJson).toContain('"agentId":"jobs"')
  })

  it('records AgentTaskRunRecord for each multi-agent subtask', async () => {
    routeState.mode = 'multi'
    const message = `${testPrefix} multi agent`

    const response = await postChat(message)
    const text = await response.text()
    const correlationId = await getRunCorrelationId(message)
    const records = await prisma.agentTaskRunRecord.findMany({
      where: { correlationId },
      orderBy: { createdAt: 'asc' },
    })

    expect(response.status).toBe(200)
    expect(text).toContain('"type":"decomposition"')
    expect(text).toContain('"agentTaskRunRecordId":"')
    expect(records).toHaveLength(2)
    expect(records.map((record) => record.taskType)).toEqual(['chat_subtask', 'chat_subtask'])
    expect(records.map((record) => record.status)).toEqual(['completed', 'completed'])
  })

  it('records failed AgentTaskRunRecord when the routed agent execution fails', async () => {
    routeState.mode = 'failed'
    const message = `${testPrefix} failed agent`

    const response = await postChat(message)
    const text = await response.text()
    const correlationId = await getRunCorrelationId(message)
    const record = await prisma.agentTaskRunRecord.findFirst({
      where: { correlationId },
      orderBy: { createdAt: 'desc' },
    })
    const auditEvents = await prisma.harmonyAuditEvent.findMany({
      where: { correlationId },
      orderBy: { createdAt: 'asc' },
    })

    expect(response.status).toBe(200)
    expect(text).toContain('"status":"failed"')
    expect(record?.status).toBe('failed')
    expect(record?.errorJson).toContain('unknown_agent')
    expect(auditEvents.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(['agent_task.started', 'agent_task.failed'])
    )
  })

  it('withholds direct tool requests in the single-agent route', async () => {
    routeState.mode = 'single'
    llmState.mode = 'tool_request'
    const message = `${testPrefix} single agent tool request`

    const response = await postChat(message)
    const text = await response.text()
    const correlationId = await getRunCorrelationId(message)
    const record = await prisma.agentTaskRunRecord.findFirst({
      where: { correlationId },
      orderBy: { createdAt: 'desc' },
    })
    const auditEvents = await prisma.harmonyAuditEvent.findMany({
      where: { correlationId },
      orderBy: { createdAt: 'asc' },
    })

    expect(response.status).toBe(200)
    expect(executeToolCall).not.toHaveBeenCalled()
    expect(text).toContain('"type":"agent_result"')
    expect(text).toContain('"requiresApproval":true')
    expect(text).toContain('"blockedToolRequests"')
    expect(record?.status).toBe('completed')
    expect(record?.outputJson).toContain('"blockedToolRequests"')
    expect(auditEvents.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(['agent_task.started', 'agent_task.tool_request_blocked', 'agent_task.completed'])
    )
  })

  it('withholds direct tool requests in the multi-agent route', async () => {
    routeState.mode = 'multi'
    llmState.mode = 'tool_request'
    const message = `${testPrefix} multi agent tool request`

    const response = await postChat(message)
    const text = await response.text()
    const correlationId = await getRunCorrelationId(message)
    const records = await prisma.agentTaskRunRecord.findMany({
      where: { correlationId },
      orderBy: { createdAt: 'asc' },
    })
    const auditEvents = await prisma.harmonyAuditEvent.findMany({
      where: { correlationId },
      orderBy: { createdAt: 'asc' },
    })

    expect(response.status).toBe(200)
    expect(executeToolCall).not.toHaveBeenCalled()
    expect(text).toContain('"type":"decomposition"')
    expect(text).toContain('"requiresApproval":true')
    expect(records).toHaveLength(2)
    expect(records.every((record) => record.status === 'completed')).toBe(true)
    expect(auditEvents.filter((event) => event.eventType === 'agent_task.tool_request_blocked')).toHaveLength(2)
  })
})
