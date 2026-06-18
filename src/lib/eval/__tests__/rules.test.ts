import { describe, expect, it } from 'vitest'
import { buildEvalTargetMetadata, produceDeterministicEval, assignLayer, EVAL_LAYER_TEMPLATES } from '../rules'
import type { EvalTarget } from '../types'

describe('Sprint 7 EvalTarget mapping and deterministic verification', () => {
  it('maps ContextPacket metadata without execution semantics', () => {
    const metadata = buildEvalTargetMetadata('context_packet', 'ctx_1', {
      taskId: 'task_1',
      agentRunId: 'agent_1',
    })

    expect(metadata.contextPacketId).toBe('ctx_1')
    expect(metadata.taskId).toBe('task_1')
    expect(metadata.agentRunId).toBe('agent_1')
  })

  it('produces recommendation-only blocked gate for non-empty sideEffects', () => {
    const target: EvalTarget = {
      id: 'eval_target_1',
      targetType: 'agent_result',
      targetId: 'agent_1',
      agentRunId: 'agent_1',
      source: 'system_test',
      snapshot: {
        status: 'completed',
        sideEffects: { filesChanged: ['x.ts'] },
      },
      snapshotVersion: 'test',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const result = produceDeterministicEval({
      evalRunId: 'eval_run_1',
      evalTarget: target,
      now: new Date().toISOString(),
    })

    expect(result.qualityGateDecision.decision).toBe('blocked')
    expect(result.qualityGateDecision.blocksFutureExecutionRecommendation).toBe(true)
    expect(result.findings.some((finding) => finding.needsHumanReview)).toBe(true)
  })
})

describe('Four-layer Eval category (EvalLayerCategory)', () => {
  describe('EVAL_LAYER_TEMPLATES', () => {
    it('should have all four layers defined', () => {
      expect(EVAL_LAYER_TEMPLATES.functional).toBeDefined()
      expect(EVAL_LAYER_TEMPLATES.performance).toBeDefined()
      expect(EVAL_LAYER_TEMPLATES.boundary).toBeDefined()
      expect(EVAL_LAYER_TEMPLATES.business).toBeDefined()
    })

    it('each layer should have at least 3 templates', () => {
      expect(EVAL_LAYER_TEMPLATES.functional.length).toBeGreaterThanOrEqual(3)
      expect(EVAL_LAYER_TEMPLATES.performance.length).toBeGreaterThanOrEqual(3)
      expect(EVAL_LAYER_TEMPLATES.boundary.length).toBeGreaterThanOrEqual(3)
      expect(EVAL_LAYER_TEMPLATES.business.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('assignLayer', () => {
    it('should assign performance layer for safety-related checks', () => {
      expect(assignLayer('safety.no_side_effects', 'No executed or pending side effects')).toBe('performance')
      expect(assignLayer('safety.data_leak', 'No sensitive data exposure')).toBe('performance')
    })

    it('should assign performance layer for permission-related checks', () => {
      expect(assignLayer('permission.default_deny', 'ToolPermission has no execute decision')).toBe('performance')
    })

    it('should assign boundary layer for confirmation checks', () => {
      expect(assignLayer('confirmation.boundary', 'Human confirmation boundary')).toBe('boundary')
    })

    it('should assign boundary layer for regression checks', () => {
      expect(assignLayer('target.boundary', 'Sprint 7 recommendation-only boundary')).toBe('boundary')
    })

    it('should assign functional layer for schema checks', () => {
      expect(assignLayer('schema.required_fields', 'Required local snapshot fields')).toBe('functional')
    })

    it('should assign functional layer for context_packet checks', () => {
      expect(assignLayer('context_packet.audit_only', 'ContextPacket eval is audit-only')).toBe('functional')
    })

    it('should assign business layer as default fallback', () => {
      expect(assignLayer('unknown.check', 'Some unrelated check')).toBe('business')
    })

    it('should be case-insensitive', () => {
      expect(assignLayer('SAFETY.Check', 'Safety Check')).toBe('performance')
      expect(assignLayer('Schema.Fields', 'Schema Fields')).toBe('functional')
    })
  })

  describe('produceDeterministicEval with layer', () => {
    it('should include layer field on all checks', () => {
      const target: EvalTarget = {
        id: 'eval_target_layer',
        targetType: 'agent_result',
        targetId: 'agent_1',
        agentRunId: 'agent_1',
        source: 'system_test',
        snapshot: { status: 'completed' },
        snapshotVersion: 'test',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = produceDeterministicEval({
        evalRunId: 'eval_run_layer',
        evalTarget: target,
        now: new Date().toISOString(),
      })

      for (const check of result.checks) {
        expect(check.layer).toBeDefined()
        expect(['functional', 'performance', 'boundary', 'business']).toContain(check.layer)
      }
    })

    it('should assign correct layers to standard checks', () => {
      const target: EvalTarget = {
        id: 'eval_target_layers2',
        targetType: 'agent_result',
        targetId: 'agent_1',
        source: 'system_test',
        snapshot: { status: 'completed' },
        snapshotVersion: 'test',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = produceDeterministicEval({
        evalRunId: 'eval_run_layers2',
        evalTarget: target,
        now: new Date().toISOString(),
      })

      const schemaCheck = result.checks.find((c) => c.checkKey === 'schema.required_fields')
      const safetyCheck = result.checks.find((c) => c.checkKey === 'safety.no_side_effects')
      const confirmCheck = result.checks.find((c) => c.checkKey === 'confirmation.boundary')

      expect(schemaCheck?.layer).toBe('functional')
      expect(safetyCheck?.layer).toBe('performance')
      expect(confirmCheck?.layer).toBe('boundary')
    })
  })
})
