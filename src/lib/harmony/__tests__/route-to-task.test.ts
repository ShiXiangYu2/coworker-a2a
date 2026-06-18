import { describe, expect, it } from 'vitest'
import type { RouteDecision } from '@/lib/agents/types'
import { createRouteToTaskDraft } from '../route-to-task'

function decision(overrides: Partial<RouteDecision> = {}): RouteDecision {
  return {
    status: 'ready',
    decisionType: 'delegate_to_agent',
    targetAgentId: 'jobs',
    confidence: 0.88,
    reason: 'Product work should go to Jobs.',
    matchedSignals: ['prd'],
    suggestedTaskTitle: 'Write PRD',
    requiresHumanConfirmation: false,
    next: {
      recommendedAction: 'show_route_suggestion',
      reason: 'Create a task if desired.',
    },
    sideEffects: {
      filesChanged: [],
      branchesCreated: [],
      prsCreated: [],
      issuesUpdated: [],
    },
    ...overrides,
  }
}

describe('RouteDecision to Harmony Task', () => {
  it('creates a queued product task for Jobs routes', () => {
    const bundle = createRouteToTaskDraft({
      sourceMessageText: 'Help me write a PRD',
      routeDecision: decision(),
    })

    expect(bundle.task?.status).toBe('queued')
    expect(bundle.task?.type).toBe('product')
    expect(bundle.task?.targetAgentId).toBe('jobs')
    expect(bundle.task?.routeDecisionSnapshot).toMatchObject({
      decisionType: 'delegate_to_agent',
    })
  })

  it('skips chat-only decisions by default', () => {
    const bundle = createRouteToTaskDraft({
      sourceMessageText: 'Explain routing',
      routeDecision: decision({
        decisionType: 'chat_only',
        targetAgentId: undefined,
      }),
    })

    expect(bundle.task).toBeUndefined()
    expect(bundle.skippedReason).toBe('chat_only')
  })

  it('skips unsupported decisions', () => {
    const bundle = createRouteToTaskDraft({
      sourceMessageText: 'Call external integration',
      routeDecision: decision({
        status: 'unsupported',
        decisionType: 'unsupported',
        targetAgentId: undefined,
      }),
    })

    expect(bundle.task).toBeUndefined()
    expect(bundle.skippedReason).toBe('unsupported')
  })

  it('requires confirmation for high-risk or side-effect decisions', () => {
    const bundle = createRouteToTaskDraft({
      sourceMessageText: 'Delete files',
      routeDecision: decision({
        status: 'blocked',
        decisionType: 'needs_human_confirmation',
        targetAgentId: 'kelvin',
        requiresHumanConfirmation: true,
        sideEffects: {
          filesChanged: ['danger.txt'],
          branchesCreated: [],
          prsCreated: [],
          issuesUpdated: [],
        },
      }),
    })

    expect(bundle.task?.status).toBe('pending_confirmation')
    expect(bundle.task?.sideEffects).toEqual({
      filesChanged: [],
      branchesCreated: [],
      prsCreated: [],
      issuesUpdated: [],
    })
    expect(bundle.task?.routeDecisionSnapshot.sideEffects.filesChanged).toEqual([
      'danger.txt',
    ])
    expect(bundle.confirmationArtifact?.status).toBe('pending')
    expect(bundle.taskRun?.status).toBe('blocked')
  })
})
