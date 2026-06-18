import { describe, expect, it } from 'vitest'
import { buildEvalTargetMetadata, produceDeterministicEval } from '../rules'
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
