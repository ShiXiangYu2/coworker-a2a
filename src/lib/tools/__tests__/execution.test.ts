import { describe, expect, it } from 'vitest'
import {
  defaultToolExecutionPolicy,
  defaultToolSandbox,
  executeDeterministicLocalTool,
  getToolExecutor,
  validateExecutionPreconditions,
  validateExecutionPolicy,
  validateToolSandbox,
} from '../execution'
import { findToolByIdOrName } from '../registry'
import type { ToolCall, ToolExecutionPlan, ToolPermission, ToolRun } from '../types'

const now = new Date().toISOString()

function toolRun(overrides: Partial<ToolRun> = {}): ToolRun {
  return {
    id: 'run-1',
    toolCallId: 'call-1',
    toolId: 'noop.note',
    status: 'approved_for_execution',
    mode: 'controlled_execution',
    inputSnapshot: { note: 'hello' },
    idempotencyKey: 'idem-1',
    sideEffectClass: 'none',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function plan(overrides: Partial<ToolExecutionPlan> = {}): ToolExecutionPlan {
  return {
    id: 'plan-1',
    toolRunId: 'run-1',
    toolCallId: 'call-1',
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
    inputSnapshot: { note: 'hello' },
    normalizedInputHash: 'hash',
    policyVersion: 'sprint-11.0',
    executorVersion: 'sprint-11.0',
    requiresKelvinConfirmation: true,
    confirmationArtifactId: 'confirmation-1',
    recoveryPointId: 'recovery-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

const permission: ToolPermission = {
  id: 'permission-1',
  toolCallId: 'call-1',
  toolId: 'noop.note',
  decision: 'allow_controlled_execution',
  reason: 'Allowed controlled execution.',
  evaluatedBy: 'policy',
  policyRef: 'tool-execution-policy-sprint-11',
  permissionProfileRef: 'default-deny-sprint-6',
  riskLevel: 'low',
  inputValidationStatus: 'valid',
  matchedRules: [],
  deniedRules: [],
  createdAt: now,
}

const call: ToolCall = {
  id: 'call-1',
  source: 'agent_result',
  toolId: 'noop.note',
  toolName: 'noop.note',
  intent: 'Record note',
  rationale: 'No-op',
  input: { note: 'hello' },
  inputSummary: 'hello',
  status: 'approved_record',
  riskLevel: 'low',
  sideEffects: [],
  createdAt: now,
  updatedAt: now,
}

describe('Sprint 11 controlled tool runtime rules', () => {
  it('keeps ToolExecutionPolicy and ToolSandbox narrow', () => {
    const tool = findToolByIdOrName('noop.note')
    const executor = getToolExecutor('internal_noop.executor')
    expect(tool).toBeTruthy()
    expect(executor).toBeTruthy()
    expect(() => validateToolSandbox(defaultToolSandbox)).not.toThrow()
    expect(() => validateExecutionPolicy(defaultToolExecutionPolicy, tool!, executor!)).not.toThrow()
    expect(defaultToolExecutionPolicy.deniedToolCategories).toContain('read')
    expect(defaultToolExecutionPolicy.deniedToolCategories).toContain('write')
  })

  it('rejects legacy ToolRun mode, allow_record_only, expired plan, and missing before_tool_execution RecoveryPoint', () => {
    expect(() =>
      validateExecutionPreconditions({
        toolRun: toolRun({ mode: 'mock_only' }),
        plan: plan(),
        permission,
        recoveryPoint: { id: 'recovery-1', reason: 'before_tool_execution' },
        confirmationArtifact: { id: 'confirmation-1', status: 'approved' },
      })
    ).toThrow(/Legacy ToolRun/)

    expect(() =>
      validateExecutionPreconditions({
        toolRun: toolRun(),
        plan: plan(),
        permission: { ...permission, decision: 'allow_record_only' },
        recoveryPoint: { id: 'recovery-1', reason: 'before_tool_execution' },
        confirmationArtifact: { id: 'confirmation-1', status: 'approved' },
      })
    ).toThrow(/allow_record_only/)

    expect(() =>
      validateExecutionPreconditions({
        toolRun: toolRun(),
        plan: plan({ status: 'expired' }),
        permission,
        recoveryPoint: { id: 'recovery-1', reason: 'before_tool_execution' },
        confirmationArtifact: { id: 'confirmation-1', status: 'approved' },
      })
    ).toThrow(/Expired/)

    expect(() =>
      validateExecutionPreconditions({
        toolRun: toolRun(),
        plan: plan(),
        permission,
        recoveryPoint: { id: 'recovery-1', reason: 'before_state_transition' },
        confirmationArtifact: { id: 'confirmation-1', status: 'approved' },
      })
    ).toThrow(/before_tool_execution/)
  })

  it('executes deterministic local no-op with empty side effects only', () => {
    const executor = getToolExecutor('internal_noop.executor')!
    const first = executeDeterministicLocalTool({ toolRun: toolRun(), toolCall: call, plan: plan(), executor })
    const second = executeDeterministicLocalTool({ toolRun: toolRun(), toolCall: call, plan: plan(), executor })

    expect(first.result.sideEffects).toEqual([])
    expect(first.result.next.recommendedAction).toBe('stop')
    expect(first.result.outputHash).toBe(second.result.outputHash)
  })
})
