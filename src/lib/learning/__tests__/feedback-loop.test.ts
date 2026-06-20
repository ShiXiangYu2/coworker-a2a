import { describe, expect, it, beforeEach } from 'vitest'
import {
  recordRoutingOutcome,
  getRoutingRecords,
  clearRoutingRecords,
  analyzeAgentPerformance,
  computeRoutingAdjustments,
  getRoutingWeight,
  getRoutingSummary,
} from '../feedback-loop'

describe('Learning Feedback Loop', () => {
  beforeEach(() => {
    clearRoutingRecords()
  })

  describe('recordRoutingOutcome', () => {
    it('records a routing outcome', () => {
      const record = recordRoutingOutcome({
        agentId: 'linus',
        taskType: 'engineering',
        routeConfidence: 0.85,
        executionStatus: 'completed',
        executionConfidence: 0.9,
        durationMs: 5000,
        matchedSignals: ['code', 'architecture'],
      })

      expect(record.id).toMatch(/^rr-/)
      expect(record.timestamp).toBeDefined()
      expect(record.agentId).toBe('linus')
      expect(record.executionStatus).toBe('completed')
    })

    it('maintains sliding window of 100 records', () => {
      for (let i = 0; i < 120; i++) {
        recordRoutingOutcome({
          agentId: 'linus',
          taskType: 'engineering',
          routeConfidence: 0.8,
          executionStatus: 'completed',
          executionConfidence: 0.85,
          durationMs: 5000,
          matchedSignals: [],
        })
      }

      expect(getRoutingRecords().length).toBe(100)
    })
  })

  describe('analyzeAgentPerformance', () => {
    it('returns empty array when no records', () => {
      const stats = analyzeAgentPerformance()
      expect(stats).toHaveLength(0)
    })

    it('calculates success rate correctly', () => {
      // 3 success, 1 failure for linus
      for (let i = 0; i < 3; i++) {
        recordRoutingOutcome({
          agentId: 'linus',
          taskType: 'engineering',
          routeConfidence: 0.8,
          executionStatus: 'completed',
          executionConfidence: 0.85,
          durationMs: 5000,
          matchedSignals: [],
        })
      }
      recordRoutingOutcome({
        agentId: 'linus',
        taskType: 'engineering',
        routeConfidence: 0.7,
        executionStatus: 'failed',
        executionConfidence: 0.3,
        durationMs: 2000,
        matchedSignals: [],
      })

      const stats = analyzeAgentPerformance()
      expect(stats).toHaveLength(1)
      expect(stats[0].agentId).toBe('linus')
      expect(stats[0].successRate).toBe(0.75)
      expect(stats[0].totalExecutions).toBe(4)
    })

    it('identifies strongest and weakest task types', () => {
      // linus: 3 engineering success, 1 product failure
      for (let i = 0; i < 3; i++) {
        recordRoutingOutcome({
          agentId: 'linus',
          taskType: 'engineering',
          routeConfidence: 0.8,
          executionStatus: 'completed',
          executionConfidence: 0.85,
          durationMs: 5000,
          matchedSignals: [],
        })
      }
      recordRoutingOutcome({
        agentId: 'linus',
        taskType: 'product',
        routeConfidence: 0.6,
        executionStatus: 'failed',
        executionConfidence: 0.3,
        durationMs: 2000,
        matchedSignals: [],
      })

      const stats = analyzeAgentPerformance()
      expect(stats[0].strongestTaskTypes[0].type).toBe('engineering')
      expect(stats[0].strongestTaskTypes[0].successRate).toBe(1.0)
      expect(stats[0].weakestTaskTypes[0].type).toBe('product')
      expect(stats[0].weakestTaskTypes[0].successRate).toBe(0)
    })
  })

  describe('computeRoutingAdjustments', () => {
    it('returns empty when insufficient data', () => {
      // Only 2 records, below MIN_SAMPLE_SIZE of 5
      for (let i = 0; i < 2; i++) {
        recordRoutingOutcome({
          agentId: 'linus',
          taskType: 'engineering',
          routeConfidence: 0.8,
          executionStatus: 'completed',
          executionConfidence: 0.85,
          durationMs: 5000,
          matchedSignals: [],
        })
      }

      const adjustments = computeRoutingAdjustments()
      expect(adjustments).toHaveLength(0)
    })

    it('suggests higher weight for above-average performance', () => {
      // linus: 10 engineering success (100%)
      for (let i = 0; i < 10; i++) {
        recordRoutingOutcome({
          agentId: 'linus',
          taskType: 'engineering',
          routeConfidence: 0.8,
          executionStatus: 'completed',
          executionConfidence: 0.85,
          durationMs: 5000,
          matchedSignals: [],
        })
      }

      // linus: 5 product failure (0%)
      for (let i = 0; i < 5; i++) {
        recordRoutingOutcome({
          agentId: 'linus',
          taskType: 'product',
          routeConfidence: 0.6,
          executionStatus: 'failed',
          executionConfidence: 0.3,
          durationMs: 2000,
          matchedSignals: [],
        })
      }

      const adjustments = computeRoutingAdjustments()
      const engAdjustment = adjustments.find((a) => a.taskType === 'engineering')
      const prodAdjustment = adjustments.find((a) => a.taskType === 'product')

      expect(engAdjustment).toBeDefined()
      expect(engAdjustment!.suggestedWeight).toBeGreaterThan(1.0)

      expect(prodAdjustment).toBeDefined()
      expect(prodAdjustment!.suggestedWeight).toBeLessThan(1.0)
    })
  })

  describe('getRoutingWeight', () => {
    it('returns default weight when no data', () => {
      const weight = getRoutingWeight('linus', 'engineering')
      expect(weight).toBe(1.0)
    })
  })

  describe('getRoutingSummary', () => {
    it('returns summary with trend', () => {
      // Add some records
      for (let i = 0; i < 5; i++) {
        recordRoutingOutcome({
          agentId: 'linus',
          taskType: 'engineering',
          routeConfidence: 0.8,
          executionStatus: 'completed',
          executionConfidence: 0.85,
          durationMs: 5000,
          matchedSignals: [],
        })
      }

      const summary = getRoutingSummary()
      expect(summary.totalDecisions).toBe(5)
      expect(summary.recentTrend).toBeDefined()
      expect(summary.agentStats).toBeDefined()
    })
  })
})
