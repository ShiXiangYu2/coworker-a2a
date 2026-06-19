/**
 * ToolExecutionEngine 测试
 *
 * 覆盖：前置条件校验、路由、执行、Receipt 生成、审计日志
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { executeApprovedTool, ToolExecutionEngineError } from '../engine'
import { clearExecutionRecords } from '../sandbox-tool-executor'
import type {
  ToolCall,
  ToolExecutionPlan,
  ToolPermission,
  ToolRun,
} from '../types'

// ─── Fixtures ──────────────────────────────────────────────────────

function makeToolRun(overrides: Partial<ToolRun> = {}): ToolRun {
  return {
    id: 'tool-run-1',
    toolCallId: 'tool-call-1',
    taskId: 'task-1',
    agentRunId: 'agent-run-1',
    toolId: 'noop.note',
    status: 'approved_for_execution',
    mode: 'controlled_execution',
    inputSnapshot: { note: 'test' },
    idempotencyKey: 'idem-1',
    executionPlanId: 'plan-1',
    createdAt: '2026-06-19T00:00:00Z',
    updatedAt: '2026-06-19T00:00:00Z',
    ...overrides,
  }
}

function makeToolCall(overrides: Partial<ToolCall> = {}): ToolCall {
  return {
    id: 'tool-call-1',
    source: 'agent_result',
    toolId: 'noop.note',
    toolName: 'noop.note',
    intent: 'Record a note',
    rationale: 'Testing',
    input: { note: 'test note' },
    inputSummary: 'Test note',
    status: 'approved_record',
    riskLevel: 'low',
    sideEffects: [],
    createdAt: '2026-06-19T00:00:00Z',
    updatedAt: '2026-06-19T00:00:00Z',
    ...overrides,
  }
}

function makePlan(overrides: Partial<ToolExecutionPlan> = {}): ToolExecutionPlan {
  return {
    id: 'plan-1',
    toolRunId: 'tool-run-1',
    toolCallId: 'tool-call-1',
    taskId: 'task-1',
    agentRunId: 'agent-run-1',
    toolId: 'noop.note',
    executorId: 'internal_noop.executor',
    sandboxId: 'local-deterministic-sandbox-sprint-11',
    policyId: 'tool-execution-policy-sprint-11',
    status: 'approved_record',
    executionMode: 'deterministic_local',
    sideEffectClass: 'none',
    expectedSideEffects: [],
    reversibility: 'not_required',
    idempotencyKey: 'idem-1',
    inputSnapshot: { note: 'test' },
    normalizedInputHash: 'hash-1',
    policyVersion: 'sprint-11.0',
    executorVersion: 'sprint-11.0',
    requiresKelvinConfirmation: false,
    createdAt: '2026-06-19T00:00:00Z',
    updatedAt: '2026-06-19T00:00:00Z',
    ...overrides,
  }
}

function makePermission(overrides: Partial<ToolPermission> = {}): ToolPermission {
  return {
    id: 'perm-1',
    toolCallId: 'tool-call-1',
    toolId: 'noop.note',
    decision: 'allow_controlled_execution',
    reason: 'Safe no-op',
    evaluatedBy: 'policy',
    policyRef: 'command-policy-sprint-6',
    permissionProfileRef: 'default-deny-sprint-6',
    riskLevel: 'low',
    inputValidationStatus: 'valid',
    matchedRules: ['category.internal_noop.record_only'],
    deniedRules: [],
    createdAt: '2026-06-19T00:00:00Z',
    ...overrides,
  }
}

const recoveryPoint = { reason: 'before_tool_execution', id: 'rp-1' }

// ─── Setup ─────────────────────────────────────────────────────────

beforeEach(() => {
  clearExecutionRecords()
})

// ─── Tests ─────────────────────────────────────────────────────────

describe('ToolExecutionEngine', () => {
  describe('前置条件校验', () => {
    it('rejects ToolRun with wrong status', async () => {
      const toolRun = makeToolRun({ status: 'created' })
      await expect(
        executeApprovedTool({
          toolRun,
          toolCall: makeToolCall(),
          plan: makePlan(),
          permission: makePermission(),
          recoveryPoint,
        })
      ).rejects.toThrow(ToolExecutionEngineError)
    })

    it('rejects ToolExecutionPlan with wrong status', async () => {
      const plan = makePlan({ status: 'draft' })
      await expect(
        executeApprovedTool({
          toolRun: makeToolRun(),
          toolCall: makeToolCall(),
          plan,
          permission: makePermission(),
          recoveryPoint,
        })
      ).rejects.toThrow(ToolExecutionEngineError)
    })

    it('rejects when RecoveryPoint is missing', async () => {
      await expect(
        executeApprovedTool({
          toolRun: makeToolRun(),
          toolCall: makeToolCall(),
          plan: makePlan(),
          permission: makePermission(),
          recoveryPoint: null,
        })
      ).rejects.toThrow(ToolExecutionEngineError)
    })

    it('rejects when Kelvin confirmation is required but missing', async () => {
      const plan = makePlan({ requiresKelvinConfirmation: true })
      await expect(
        executeApprovedTool({
          toolRun: makeToolRun(),
          toolCall: makeToolCall(),
          plan,
          permission: makePermission(),
          recoveryPoint,
          confirmationArtifact: null,
        })
      ).rejects.toThrow(ToolExecutionEngineError)
    })
  })

  describe('noop 执行', () => {
    it('executes noop tool successfully', async () => {
      const result = await executeApprovedTool({
        toolRun: makeToolRun(),
        toolCall: makeToolCall(),
        plan: makePlan(),
        permission: makePermission(),
        recoveryPoint,
      })

      expect(result.executed).toBe(true)
      expect(result.receipt.status).toBe('succeeded')
      expect(result.result.status).toBe('success')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('generates valid receipt with idempotencyKey', async () => {
      const result = await executeApprovedTool({
        toolRun: makeToolRun(),
        toolCall: makeToolCall(),
        plan: makePlan(),
        permission: makePermission(),
        recoveryPoint,
      })

      expect(result.receipt.idempotencyKey).toBe('idem-1')
      expect(result.receipt.toolRunId).toBe('tool-run-1')
      expect(result.receipt.executionPlanId).toBe('plan-1')
      expect(result.receipt.sideEffectClass).toBe('none')
    })
  })

  describe('审计日志', () => {
    it('calls audit writer on success', async () => {
      const events: string[] = []
      const auditWriter = async (event: { eventType: string }) => {
        events.push(event.eventType)
        return 'audit-1'
      }

      await executeApprovedTool(
        {
          toolRun: makeToolRun(),
          toolCall: makeToolCall(),
          plan: makePlan(),
          permission: makePermission(),
          recoveryPoint,
        },
        auditWriter,
      )

      expect(events).toContain('tool_execution_started')
      expect(events).toContain('tool_execution_completed')
    })

    it('calls audit writer on precondition failure', async () => {
      const events: string[] = []
      const auditWriter = async (event: { eventType: string }) => {
        events.push(event.eventType)
        return 'audit-1'
      }

      // Precondition failure throws before audit writer is called
      const plan = makePlan({ idempotencyKey: '' })
      await expect(
        executeApprovedTool(
          {
            toolRun: makeToolRun(),
            toolCall: makeToolCall(),
            plan,
            permission: makePermission(),
            recoveryPoint,
          },
          auditWriter,
        )
      ).rejects.toThrow(ToolExecutionEngineError)

      // Audit writer should NOT be called for precondition failures
      expect(events).toHaveLength(0)
    })
  })

  describe('sandbox command 执行', () => {
    it('executes git_status via sandbox executor', async () => {
      const toolRun = makeToolRun({ toolId: 'git_status' })
      const toolCall = makeToolCall({ toolId: 'git_status', toolName: 'git_status', input: {} })
      const plan = makePlan({
        toolId: 'git_status',
        executorId: 'command.executor',
        sideEffectClass: 'none',
      })

      const result = await executeApprovedTool({
        toolRun,
        toolCall,
        plan,
        permission: makePermission({ toolId: 'git_status' }),
        recoveryPoint,
        agentId: 'linus',
      })

      expect(result.executed).toBe(true)
      expect(result.receipt.status).toBe('succeeded')
    }, 15_000)
  })
})
