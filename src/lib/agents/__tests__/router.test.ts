import { describe, expect, it } from 'vitest'
import { routeMessage } from '../router'

describe('CEO router', () => {
  it('routes PRD work to Jobs', () => {
    const decision = routeMessage({ message: 'Help me write a PRD for this feature' })
    expect(decision.status).toBe('ready')
    expect(decision.decisionType).toBe('delegate_to_agent')
    expect(decision.targetAgentId).toBe('jobs')
  })

  it('routes Chinese product work to Jobs', () => {
    const message = '\u8bf7\u5e2e\u6211\u5199\u8fd9\u4e2a\u529f\u80fd\u7684 PRD \u548c\u9a8c\u6536\u6807\u51c6'
    const decision = routeMessage({ message })
    expect(decision.status).toBe('ready')
    expect(decision.decisionType).toBe('delegate_to_agent')
    expect(decision.targetAgentId).toBe('jobs')
  })

  it('routes engineering work to Linus', () => {
    const decision = routeMessage({ message: 'Design the database and API architecture' })
    expect(decision.status).toBe('ready')
    expect(decision.targetAgentId).toBe('linus')
  })

  it('routes verification work to Turing', () => {
    const decision = routeMessage({ message: 'Add eval tests and review the acceptance criteria' })
    expect(decision.status).toBe('ready')
    expect(decision.targetAgentId).toBe('turing')
  })

  it('routes customer work to Bezos', () => {
    const decision = routeMessage({ message: 'Analyze customer feedback and competitor signals' })
    expect(decision.status).toBe('ready')
    expect(decision.targetAgentId).toBe('bezos')
  })

  it('routes complex multi-agent plans to Elon', () => {
    const decision = routeMessage({ message: 'Build a complete roadmap and coordinate multiple agents' })
    expect(decision.status).toBe('ready')
    expect(decision.targetAgentId).toBe('elon')
  })

  it('keeps lightweight questions in chat only', () => {
    const decision = routeMessage({ message: 'Explain what an agent router is' })
    expect(decision.status).toBe('ready')
    expect(decision.decisionType).toBe('chat_only')
  })

  it('requires human confirmation for high-risk actions', () => {
    const decision = routeMessage({ message: 'Delete all files and push the changes' })
    expect(decision.status).toBe('blocked')
    expect(decision.decisionType).toBe('needs_human_confirmation')
    expect(decision.targetAgentId).toBe('kelvin')
    expect(decision.requiresHumanConfirmation).toBe(true)
  })

  it('requires human confirmation for high-risk Chinese actions', () => {
    const message = '\u8bf7\u5220\u9664\u6240\u6709\u6587\u4ef6\u5e76\u90e8\u7f72\u5230\u751f\u4ea7\u73af\u5883'
    const decision = routeMessage({ message })
    expect(decision.status).toBe('blocked')
    expect(decision.decisionType).toBe('needs_human_confirmation')
    expect(decision.targetAgentId).toBe('kelvin')
    expect(decision.requiresHumanConfirmation).toBe(true)
  })

  it('marks unsupported integration requests as unsupported', () => {
    const decision = routeMessage({ message: 'Connect this to a real Feishu API now' })
    expect(decision.status).toBe('unsupported')
    expect(decision.decisionType).toBe('unsupported')
  })

  it('always returns empty side effects in Sprint 2', () => {
    const decision = routeMessage({ message: 'Write a PRD' })
    expect(decision.sideEffects).toEqual({
      filesChanged: [],
      branchesCreated: [],
      prsCreated: [],
      issuesUpdated: [],
    })
  })
})
