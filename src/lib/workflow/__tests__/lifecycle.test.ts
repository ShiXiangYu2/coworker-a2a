import { describe, expect, it } from 'vitest'
import { deriveTaskLifecyclePhase } from '../lifecycle'

describe('task lifecycle phase derivation', () => {
  it('derives intake when only an early task signal exists', () => {
    expect(deriveTaskLifecyclePhase({ taskStatus: 'created' })).toEqual({
      phase: 'intake',
      source: 'task',
      reason: 'Task status created is still in the intake lane.',
    })
  })

  it('derives consensus from queued or assigned task statuses', () => {
    expect(deriveTaskLifecyclePhase({ taskStatus: 'queued' }).phase).toBe('consensus')
    expect(deriveTaskLifecyclePhase({ taskStatus: 'assigned' }).phase).toBe('consensus')
  })

  it('derives planning when a workflow proposal exists', () => {
    expect(deriveTaskLifecyclePhase({ taskStatus: 'created', hasWorkflowProposal: true })).toMatchObject({
      phase: 'planning',
      source: 'workflow',
    })
  })

  it('derives execution for live runtime statuses', () => {
    for (const latestRuntimeStatus of ['queued', 'leased', 'running']) {
      expect(deriveTaskLifecyclePhase({ hasRuntimeJob: true, latestRuntimeStatus })).toMatchObject({
        phase: 'execution',
        source: 'runtime',
      })
    }
  })

  it('derives review when review or eval evidence exists', () => {
    expect(deriveTaskLifecyclePhase({ hasEvalOrReview: true })).toMatchObject({
      phase: 'review',
      source: 'eval',
    })
  })

  it('derives repair from blocked or failed runtime records', () => {
    expect(deriveTaskLifecyclePhase({ hasRuntimeJob: true, latestRuntimeStatus: 'blocked' })).toMatchObject({
      phase: 'repair',
      source: 'runtime',
    })
    expect(deriveTaskLifecyclePhase({ hasBlockedOrFailedExecution: true })).toMatchObject({
      phase: 'repair',
      source: 'runtime',
    })
  })

  it('falls back to intake without executable side effects', () => {
    expect(deriveTaskLifecyclePhase({})).toEqual({
      phase: 'intake',
      source: 'fallback',
      reason: 'No task, workflow, runtime, or review signal is available yet.',
    })
  })
})
