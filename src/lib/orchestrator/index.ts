export type OrchestratorName = 'elon'

export type OrchestratorTaskType = 'research_competitor_evidence' | 'compose_weekly_markdown'

export type OrchestratorAgentId = 'research.agent' | 'content.agent'

export interface OrchestratorInput {
  conversationId?: string
  userMessage: string
  scenario: 'competitor_weekly'
}

export interface OrchestratorTask {
  id: string
  agentId: OrchestratorAgentId
  type: OrchestratorTaskType
  title: string
  dependsOn?: string[]
}

export interface OrchestratorResult {
  orchestrator: OrchestratorName
  tasks: OrchestratorTask[]
}

export function runElonOrchestrator(input: OrchestratorInput): OrchestratorResult {
  if (input.scenario !== 'competitor_weekly') {
    throw new Error(`Unsupported orchestrator scenario: ${input.scenario}`)
  }

  const conversationPrefix = input.conversationId ? `${input.conversationId}:` : ''
  const researchTaskId = `${conversationPrefix}research-competitor-evidence`
  const contentTaskId = `${conversationPrefix}compose-weekly-markdown`

  return {
    orchestrator: 'elon',
    tasks: [
      {
        id: researchTaskId,
        agentId: 'research.agent',
        type: 'research_competitor_evidence',
        title: 'Summarize local competitor evidence',
      },
      {
        id: contentTaskId,
        agentId: 'content.agent',
        type: 'compose_weekly_markdown',
        title: 'Compose competitor weekly Markdown draft',
        dependsOn: [researchTaskId],
      },
    ],
  }
}
