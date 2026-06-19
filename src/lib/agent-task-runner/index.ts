import type { OrchestratorTask } from '@/lib/orchestrator'
import { prisma } from '@/lib/prisma'

export interface DemoEvidence {
  id: string
  title: string
  sourceType: 'evidence' | 'web_snapshot'
  competitor: string
  notes: string[]
  capturedAt: string
}

export type AgentTaskResult =
  | {
      taskId: string
      agentId: 'research.agent'
      kind: 'research_summary'
      outputSummary: string
      researchSummary: string[]
      evidence: DemoEvidence[]
    }
  | {
      taskId: string
      agentId: 'content.agent'
      kind: 'markdown_draft'
      outputSummary: string
      markdownDraft: string
    }

export interface AgentTaskContext {
  userMessage: string
  evidenceIds?: string[]
  researchSummary?: string[]
}

export type AgentTaskRunStatus = 'started' | 'completed' | 'failed'

export type RecordedAgentTaskResult = AgentTaskResult & {
  agentTaskRunRecordId: string
}

export interface RecordedAgentTaskInput {
  task: OrchestratorTask
  context: AgentTaskContext
  orchestrator: string
  correlationId?: string
  now?: Date
}

const MOCK_EVIDENCE: DemoEvidence[] = [
  {
    id: 'competitor-brief-notion-ai-2026-06-18',
    title: 'Notion AI daily snapshot',
    sourceType: 'web_snapshot',
    competitor: 'Notion AI',
    capturedAt: '2026-06-18T09:10:00.000Z',
    notes: [
      'Added stronger meeting-note structuring entry points.',
      'Emphasized cross-document context and integrated knowledge-base value.',
      'Pricing page continues to anchor on team collaboration value.',
    ],
  },
  {
    id: 'competitor-brief-feishu-knowledge-2026-06-18',
    title: 'Feishu knowledge Q&A local note',
    sourceType: 'evidence',
    competitor: 'Feishu Knowledge Q&A',
    capturedAt: '2026-06-18T10:00:00.000Z',
    notes: [
      'Enterprise knowledge permissions and internal search remain key positioning points.',
      'Product narrative leans toward a deposit-search-reuse loop.',
      'Mobile entry points and message-feed reach are still differentiation points.',
    ],
  },
  {
    id: 'competitor-brief-perplexity-labs-2026-06-18',
    title: 'Perplexity Labs observation',
    sourceType: 'web_snapshot',
    competitor: 'Perplexity Labs',
    capturedAt: '2026-06-18T11:30:00.000Z',
    notes: [
      'Research result pages continue to emphasize transparent citations.',
      'Evidence collection before structured output is the default experience.',
      'Research-heavy tasks are strong, while enterprise collaboration memory is lighter.',
    ],
  },
]

export async function runAgentTask(task: OrchestratorTask, context: AgentTaskContext): Promise<AgentTaskResult> {
  if (task.agentId === 'research.agent' && task.type === 'research_competitor_evidence') {
    const evidence = selectEvidence(context.evidenceIds)
    const researchSummary = summarizeEvidence(evidence)

    return {
      taskId: task.id,
      agentId: task.agentId,
      kind: 'research_summary',
      outputSummary: researchSummary.join('; '),
      researchSummary,
      evidence,
    }
  }

  if (task.agentId === 'content.agent' && task.type === 'compose_weekly_markdown') {
    const researchSummary = context.researchSummary ?? []
    const markdownDraft = renderWeeklyDraft(researchSummary, context.userMessage)

    return {
      taskId: task.id,
      agentId: task.agentId,
      kind: 'markdown_draft',
      outputSummary: 'Weekly Markdown draft compiled.',
      markdownDraft,
    }
  }

  throw new Error(`No agent task runner registered for ${task.agentId}:${task.type}`)
}

export async function runRecordedAgentTask(input: RecordedAgentTaskInput): Promise<RecordedAgentTaskResult> {
  const startedAt = input.now ?? new Date()
  const record = await prisma.agentTaskRunRecord.create({
    data: {
      correlationId: input.correlationId,
      orchestrator: input.orchestrator,
      agentId: input.task.agentId,
      taskId: input.task.id,
      taskType: input.task.type,
      status: 'started',
      inputJson: JSON.stringify({
        task: input.task,
        context: input.context,
      }),
      outputJson: null,
      errorJson: null,
      startedAt,
      completedAt: null,
    },
  })

  try {
    const result = await runAgentTask(input.task, input.context)
    const completedAt = input.now ?? new Date()

    await prisma.agentTaskRunRecord.update({
      where: { id: record.id },
      data: {
        status: 'completed',
        outputJson: JSON.stringify(result),
        errorJson: null,
        completedAt,
      },
    })

    return {
      ...result,
      agentTaskRunRecordId: record.id,
    }
  } catch (error) {
    const completedAt = input.now ?? new Date()

    await prisma.agentTaskRunRecord.update({
      where: { id: record.id },
      data: {
        status: 'failed',
        errorJson: JSON.stringify(toSerializableError(error)),
        completedAt,
      },
    })

    throw error
  }
}

function toSerializableError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    }
  }

  return {
    name: 'UnknownError',
    message: String(error),
  }
}

function selectEvidence(evidenceIds: string[] | undefined): DemoEvidence[] {
  if (!evidenceIds?.length) return MOCK_EVIDENCE
  const selected = MOCK_EVIDENCE.filter((item) => evidenceIds.includes(item.id))
  return selected.length ? selected : MOCK_EVIDENCE
}

function summarizeEvidence(evidence: DemoEvidence[]): string[] {
  return evidence.map((item) => `${item.competitor}: ${item.notes.join(' ')}`)
}

function renderWeeklyDraft(researchSummary: string[], userMessage: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const bulletSection = researchSummary.map((line) => `- ${line}`).join('\n')
  return [
    '# Competitor Weekly Draft',
    '',
    `- Request: ${userMessage}`,
    `- Generated at: ${today}`,
    '',
    '## Weekly Takeaways',
    '- Competitors continue to strengthen evidence aggregation plus structured output.',
    '- Enterprise collaboration and durable knowledge deposits remain key differentiators.',
    '- Our positioning can emphasize approval, execution traces, and deliverable landing.',
    '',
    '## Competitor Notes',
    bulletSection,
    '',
    '## Suggested Follow-ups',
    '- Compare competitors against the visible path from research result to deliverable.',
    '- Strengthen evidence citations and weekly-report template reuse.',
    '- Keep approval, receipt, and timeline visible in Operator Console.',
    '',
  ].join('\n')
}
