import { describe, expect, it } from 'vitest'
import { normalizeTask } from '../task-panel'

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    title: 'Test task',
    description: 'Task description',
    type: 'coordination',
    status: 'queued',
    targetAgentId: 'jobs',
    confidence: 0.8,
    reason: 'test',
    createdAt: '2026-06-18T00:00:00.000Z',
    ...overrides,
  }
}

describe('normalizeTask', () => {
  it('maps API agentSteps to steps', () => {
    const steps = [
      {
        id: 'step-1',
        agentId: 'jobs',
        index: 0,
        kind: 'analysis',
        status: 'completed',
        summary: 'done',
        createdAt: '2026-06-18T00:00:00.000Z',
      },
    ]

    const task = normalizeTask(makeTask({ agentSteps: steps }))

    expect(task.steps).toEqual(steps)
  })

  it('falls back to an empty steps array when no step fields are returned', () => {
    const task = normalizeTask(makeTask())

    expect(task.steps).toEqual([])
    expect(task.steps.filter((step) => step.status === 'completed')).toEqual([])
  })
})
