import { describe, it, expect } from 'vitest'
import { buildAgentSystemPromptForTask } from '../producer'
import type { HarmonyTask } from '@/lib/harmony/types'

function makeTask(overrides: Partial<HarmonyTask> = {}): HarmonyTask {
  return {
    id: 'task-1',
    conversationId: undefined,
    sourceMessageId: undefined,
    sourceMessageText: 'test message',
    title: 'Test Task',
    description: 'A test task',
    type: 'coordination',
    status: 'queued',
    routeDecisionType: 'delegate_to_agent',
    routeStatus: 'ready',
    targetAgentId: 'jobs',
    confidence: 0.8,
    reason: 'test reason',
    matchedSignals: [],
    routeDecisionSnapshot: {
      status: 'ready',
      decisionType: 'delegate_to_agent',
      targetAgentId: 'jobs',
      confidence: 0.8,
      reason: 'test',
      matchedSignals: [],
      requiresHumanConfirmation: false,
      next: { recommendedAction: 'show_route_suggestion', reason: 'test' },
      sideEffects: { filesChanged: [], branchesCreated: [], prsCreated: [], issuesUpdated: [] },
    },
    requiresHumanConfirmation: false,
    sideEffects: { filesChanged: [], branchesCreated: [], prsCreated: [], issuesUpdated: [] },
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('buildAgentSystemPromptForTask', () => {
  it('should return null for kelvin', () => {
    const task = makeTask({ targetAgentId: 'kelvin' })
    const prompt = buildAgentSystemPromptForTask(task)
    expect(prompt).toBeNull()
  })

  it('should return null for undefined agentId', () => {
    const task = makeTask({ targetAgentId: undefined })
    const prompt = buildAgentSystemPromptForTask(task)
    expect(prompt).toBeNull()
  })

  it('should build prompt with skill prompts for jobs', () => {
    const task = makeTask({ targetAgentId: 'jobs' })
    const prompt = buildAgentSystemPromptForTask(task)
    expect(prompt).toBeTruthy()
    expect(prompt).toContain('Jobs')
    expect(prompt).toContain('Product Agent')
    expect(prompt).toContain('grill-me')
    expect(prompt).toContain('to-prd')
  })

  it('should build prompt with skill prompts for linus', () => {
    const task = makeTask({ targetAgentId: 'linus' })
    const prompt = buildAgentSystemPromptForTask(task)
    expect(prompt).toBeTruthy()
    expect(prompt).toContain('Linus')
    expect(prompt).toContain('Engineering Agent')
    expect(prompt).toContain('tdd')
  })

  it('should build prompt with skill prompts for turing', () => {
    const task = makeTask({ targetAgentId: 'turing' })
    const prompt = buildAgentSystemPromptForTask(task)
    expect(prompt).toBeTruthy()
    expect(prompt).toContain('Turing')
    expect(prompt).toContain('Verification Agent')
    expect(prompt).toContain('diagnose')
    expect(prompt).toContain('loop-review')
  })

  it('should build prompt for elon with ai-builder-methodology skill', () => {
    const task = makeTask({ targetAgentId: 'elon' })
    const prompt = buildAgentSystemPromptForTask(task)
    expect(prompt).toBeTruthy()
    expect(prompt).toContain('Elon')
    expect(prompt).toContain('CEO Agent')
    expect(prompt).toContain('## 可用 Skills')
    expect(prompt).toContain('ai-builder-methodology')
  })

  it('should build prompt for bezos with zoom-out skill', () => {
    const task = makeTask({ targetAgentId: 'bezos' })
    const prompt = buildAgentSystemPromptForTask(task)
    expect(prompt).toBeTruthy()
    expect(prompt).toContain('Bezos')
    expect(prompt).toContain('Customer Agent')
    expect(prompt).toContain('## 可用 Skills')
    expect(prompt).toContain('zoom-out')
  })

  it('should include output format in prompt', () => {
    const task = makeTask({ targetAgentId: 'jobs' })
    const prompt = buildAgentSystemPromptForTask(task)
    expect(prompt).toContain('## 输出格式')
    expect(prompt).toContain('status')
    expect(prompt).toContain('confidence')
  })

  it('should include safety boundary', () => {
    const task = makeTask({ targetAgentId: 'linus' })
    const prompt = buildAgentSystemPromptForTask(task)
    expect(prompt).toContain('安全边界')
    expect(prompt).toContain('不执行工具')
  })
})
