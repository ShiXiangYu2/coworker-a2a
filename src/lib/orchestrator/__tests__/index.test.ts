import { describe, expect, it } from 'vitest'
import { runElonOrchestrator } from '../index'

describe('Elon orchestrator', () => {
  it('plans the competitor weekly flow as two agent tasks', () => {
    const result = runElonOrchestrator({
      conversationId: 'conversation-1',
      userMessage: 'Create a competitor weekly draft.',
      scenario: 'competitor_weekly',
    })

    expect(result.orchestrator).toBe('elon')
    expect(result.tasks).toHaveLength(2)
    expect(result.tasks[0]).toMatchObject({
      agentId: 'research.agent',
      type: 'research_competitor_evidence',
    })
    expect(result.tasks[1]).toMatchObject({
      agentId: 'content.agent',
      type: 'compose_weekly_markdown',
      dependsOn: ['conversation-1:research-competitor-evidence'],
    })
  })
})
