import { describe, expect, it } from 'vitest'
import {
  canExecute,
  getExecutableSubtasks,
  collectResults,
  type SubtaskRecord,
} from '../subtask-manager'

describe('Subtask Manager', () => {
  function makeSubtask(overrides: Partial<SubtaskRecord> = {}): SubtaskRecord {
    return {
      index: 0,
      definition: {
        title: 'Test subtask',
        description: 'A test subtask',
        targetAgentId: 'jobs',
        type: 'product',
        dependsOn: [],
        priority: 'medium',
      },
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    }
  }

  describe('canExecute', () => {
    it('returns true for pending subtask with no dependencies', () => {
      const subtask = makeSubtask()
      expect(canExecute(subtask, [subtask])).toBe(true)
    })

    it('returns false for running subtask', () => {
      const subtask = makeSubtask({ status: 'running' })
      expect(canExecute(subtask, [subtask])).toBe(false)
    })

    it('returns false for completed subtask', () => {
      const subtask = makeSubtask({ status: 'completed' })
      expect(canExecute(subtask, [subtask])).toBe(false)
    })

    it('returns false when dependency not completed', () => {
      const dep = makeSubtask({ index: 0, status: 'pending' })
      const subtask = makeSubtask({
        index: 1,
        definition: {
          ...makeSubtask().definition,
          dependsOn: [0],
        },
        status: 'pending',
      })
      expect(canExecute(subtask, [dep, subtask])).toBe(false)
    })

    it('returns true when dependency is completed', () => {
      const dep = makeSubtask({ index: 0, status: 'completed' })
      const subtask = makeSubtask({
        index: 1,
        definition: {
          ...makeSubtask().definition,
          dependsOn: [0],
        },
        status: 'pending',
      })
      expect(canExecute(subtask, [dep, subtask])).toBe(true)
    })
  })

  describe('getExecutableSubtasks', () => {
    it('returns pending subtasks with no dependencies', () => {
      const subtasks = [
        makeSubtask({ index: 0, status: 'pending' }),
        makeSubtask({ index: 1, status: 'completed' }),
        makeSubtask({ index: 2, status: 'running' }),
      ]
      const executable = getExecutableSubtasks(subtasks)
      expect(executable).toHaveLength(1)
      expect(executable[0].index).toBe(0)
    })

    it('returns multiple executable subtasks', () => {
      const subtasks = [
        makeSubtask({ index: 0, status: 'pending' }),
        makeSubtask({ index: 1, status: 'pending' }),
      ]
      const executable = getExecutableSubtasks(subtasks)
      expect(executable).toHaveLength(2)
    })
  })

  describe('collectResults', () => {
    it('collects results from mixed status subtasks', () => {
      const subtasks = [
        makeSubtask({ index: 0, status: 'completed', resultSummary: 'Done', resultConfidence: 0.9 }),
        makeSubtask({ index: 1, status: 'failed', error: 'Error' }),
        makeSubtask({ index: 2, status: 'blocked' }),
      ]
      const result = collectResults(subtasks)
      expect(result.allCompleted).toBe(false)
      expect(result.anyFailed).toBe(true)
      expect(result.anyBlocked).toBe(true)
      expect(result.completedCount).toBe(1)
      expect(result.failedCount).toBe(1)
      expect(result.blockedCount).toBe(1)
    })

    it('returns allCompleted when all subtasks completed', () => {
      const subtasks = [
        makeSubtask({ index: 0, status: 'completed' }),
        makeSubtask({ index: 1, status: 'completed' }),
      ]
      const result = collectResults(subtasks)
      expect(result.allCompleted).toBe(true)
      expect(result.anyFailed).toBe(false)
    })
  })
})
