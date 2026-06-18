import { createHash } from 'node:crypto'
import type {
  EvalCheck,
  EvalFinding,
  EvalTarget,
  EvalTargetType,
  EvalLayerCategory,
  QualityGateDecision,
} from './types'

type EvalCheckDraft = Omit<EvalCheck, 'id' | 'evalRunId' | 'evalTargetId' | 'createdAt'>

// ─── 四层 Eval 体系（auto-dev-framework） ─────────────────────────

/**
 * 四层 Eval 检查模板
 *
 * 每层定义关键检查维度，用于自动分配 layer 和生成检查项。
 */
export const EVAL_LAYER_TEMPLATES: Record<EvalLayerCategory, string[]> = {
  functional: [
    '核心用户路径可以完成',
    '输出符合业务规则',
    '权限内用户可以访问',
  ],
  performance: [
    '不泄露敏感数据',
    '关键路径在可接受时间内完成',
    '外部 API 调用失败不会导致系统崩溃',
  ],
  boundary: [
    '空输入有明确处理',
    '重复提交不会产生错误副作用',
    '网络失败可以重试或降级',
  ],
  business: [
    '节省了明确的人工作业时间或步骤',
    '降低了错误率或返工次数',
    '价值证据可被记录和复查',
  ],
}

/**
 * checkKey / title → layer 映射规则
 *
 * 基于关键词匹配，将 check 自动分配到四层 Eval 中。
 * 优先级从上到下，首个匹配的规则生效。
 */
const LAYER_ASSIGNMENT_RULES: { keywords: string[]; layer: EvalLayerCategory }[] = [
  // performance — 安全、权限、副作用
  { keywords: ['safety', 'side_effects', 'side effects', 'no_side_effects'], layer: 'performance' },
  { keywords: ['permission', 'deny', 'execute'], layer: 'performance' },
  { keywords: ['sensitive', 'leak', 'expose', 'data_leak'], layer: 'performance' },
  // boundary — 确认边界、异常处理、回归
  { keywords: ['confirmation', 'human', 'boundary'], layer: 'boundary' },
  { keywords: ['regression', 'rollback', 'revert'], layer: 'boundary' },
  { keywords: ['error', 'fail', 'retry', 'timeout'], layer: 'boundary' },
  // functional — schema、状态机、一致性、质量
  { keywords: ['schema', 'required_fields', 'field'], layer: 'functional' },
  { keywords: ['state_machine', 'state', 'status', 'transition'], layer: 'functional' },
  { keywords: ['consistency', 'quality', 'correctness'], layer: 'functional' },
  { keywords: ['audit_only', 'provenance', 'context_packet'], layer: 'functional' },
  // business — 默认归到 business（兜底）
  { keywords: [], layer: 'business' },
]

/**
 * 根据 checkKey 和 title 自动分配四层 Eval 分类
 */
export function assignLayer(checkKey: string, title: string): EvalLayerCategory {
  const text = `${checkKey} ${title}`.toLowerCase()
  for (const rule of LAYER_ASSIGNMENT_RULES) {
    if (rule.keywords.length === 0) return rule.layer // 兜底
    if (rule.keywords.some((kw) => text.includes(kw))) return rule.layer
  }
  return 'business' // 默认兜底
}

export function hashSnapshot(snapshot: unknown): string {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
}

export function buildEvalTargetMetadata(
  targetType: EvalTargetType,
  targetId: string,
  snapshot: Record<string, unknown>
): Pick<
  EvalTarget,
  | 'routeDecisionId'
  | 'taskId'
  | 'agentRunId'
  | 'agentResultId'
  | 'toolCallId'
  | 'toolPermissionId'
  | 'memoryEntryId'
  | 'knowledgeItemId'
  | 'contextPacketId'
  | 'a2aMessageId'
> {
  const taskId = stringFrom(snapshot.taskId)
  const agentRunId = stringFrom(snapshot.agentRunId)
  return {
    routeDecisionId: targetType === 'route_decision' ? targetId : stringFrom(snapshot.routeDecisionId),
    taskId,
    agentRunId,
    agentResultId: targetType === 'agent_result' ? targetId : stringFrom(snapshot.agentResultId),
    toolCallId: targetType === 'tool_call' ? targetId : stringFrom(snapshot.toolCallId),
    toolPermissionId:
      targetType === 'tool_permission' ? targetId : stringFrom(snapshot.toolPermissionId),
    memoryEntryId: targetType === 'memory_entry' ? targetId : stringFrom(snapshot.memoryEntryId),
    knowledgeItemId:
      targetType === 'knowledge_item' ? targetId : stringFrom(snapshot.knowledgeItemId),
    contextPacketId:
      targetType === 'context_packet' ? targetId : stringFrom(snapshot.contextPacketId),
    a2aMessageId: targetType === 'a2a_message' ? targetId : stringFrom(snapshot.a2aMessageId),
  }
}

export function produceDeterministicEval(input: {
  evalRunId: string
  evalTarget: EvalTarget
  now: string
}): {
  checks: Omit<EvalCheck, 'id' | 'evalRunId' | 'evalTargetId' | 'createdAt'>[]
  findings: Omit<EvalFinding, 'id' | 'evalRunId' | 'evalTargetId' | 'createdAt' | 'updatedAt'>[]
  qualityGateDecision: QualityGateDecision
} {
  const snapshot = objectFrom(input.evalTarget.snapshot)
  const checks: EvalCheckDraft[] = [
    schemaCheck(input.evalTarget.targetType, snapshot),
    safetyCheck(snapshot),
    confirmationCheck(snapshot),
    targetSpecificCheck(input.evalTarget.targetType, snapshot),
  ]
  const findings = checks
    .filter((check) => ['warned', 'failed', 'blocked'].includes(check.status))
    .map((check) => ({
      relatedCheckIds: [check.checkKey],
      severity: check.severity,
      category: findingCategoryFor(check.category),
      title: check.title,
      description: check.evidence.join(' '),
      targetPath: check.targetPath,
      targetField: check.targetField,
      evidence: check.evidence,
      evidenceRefs: check.evidenceRefs,
      recommendation:
        check.recommendation ?? 'Review this finding before relying on the target record.',
      status: check.severity === 'high' || check.severity === 'critical'
        ? 'review_requested'
        : 'open',
      needsHumanReview: check.severity === 'high' || check.severity === 'critical',
    })) satisfies Omit<
      EvalFinding,
      'id' | 'evalRunId' | 'evalTargetId' | 'createdAt' | 'updatedAt'
    >[]

  const blocked = checks.some((check) => check.status === 'blocked')
  const failed = checks.some((check) => check.status === 'failed')
  const warned = checks.some((check) => check.status === 'warned')
  const needsHumanReview = findings.some((finding) => finding.needsHumanReview)
  const decision = blocked
    ? 'blocked'
    : needsHumanReview
      ? 'needs_human_review'
      : failed
        ? 'fail'
        : warned
          ? 'warn'
          : 'pass'

  return {
    checks,
    findings,
    qualityGateDecision: {
      gateVersion: 'sprint-7-deterministic-v1',
      sourceEvalRunId: input.evalRunId,
      checkIds: checks.map((check) => check.checkKey),
      findingIds: findings.map((finding) => finding.title),
      decision,
      confidence: decision === 'pass' ? 0.9 : 0.75,
      summary: `Deterministic verification completed for ${input.evalTarget.targetType}.`,
      reasons: checks.map((check) => `${check.checkKey}: ${check.status}`),
      requiredActions: findings.map((finding) => finding.recommendation),
      recommendedOwnerAgentId: needsHumanReview ? 'kelvin' : 'turing',
      blocksFutureExecutionRecommendation: decision === 'blocked',
      requiresKelvinReview: needsHumanReview || decision === 'blocked',
      evaluatedAt: input.now,
    },
  }
}

function schemaCheck(targetType: EvalTargetType, snapshot: Record<string, unknown>): EvalCheckDraft {
  const hasStatus = typeof snapshot.status === 'string' || targetType === 'route_decision'
  const checkKey = 'schema.required_fields'
  const title = 'Required local snapshot fields'
  return {
    checkKey,
    title,
    category: 'schema' as const,
    layer: assignLayer(checkKey, title),
    status: hasStatus ? 'passed' as const : 'failed' as const,
    severity: hasStatus ? 'info' as const : 'medium' as const,
    confidence: 0.9,
    targetField: 'status',
    evidence: hasStatus
      ? ['Snapshot contains enough status information for local verification.']
      : ['Snapshot is missing a status-like field.'],
    recommendation: hasStatus ? undefined : 'Refresh the target snapshot before relying on this eval.',
  }
}

function safetyCheck(snapshot: Record<string, unknown>): EvalCheckDraft {
  const sideEffects = snapshot.sideEffects
  const hasSideEffects = Array.isArray(sideEffects)
    ? sideEffects.length > 0
    : sideEffects && typeof sideEffects === 'object'
      ? Object.values(sideEffects).some((value) => Array.isArray(value) && value.length > 0)
      : false
  const checkKey = 'safety.no_side_effects'
  const title = 'No executed or pending side effects'
  return {
    checkKey,
    title,
    category: 'safety' as const,
    layer: assignLayer(checkKey, title),
    status: hasSideEffects ? 'blocked' as const : 'passed' as const,
    severity: hasSideEffects ? 'critical' as const : 'info' as const,
    confidence: 0.9,
    targetField: 'sideEffects',
    evidence: hasSideEffects
      ? ['Target snapshot contains non-empty sideEffects. Sprint 7 must not execute them.']
      : ['No non-empty sideEffects were found in the snapshot.'],
    recommendation: hasSideEffects
      ? 'Keep this as a local finding and request Kelvin review. Do not execute anything.'
      : undefined,
  }
}

function confirmationCheck(snapshot: Record<string, unknown>): EvalCheckDraft {
  const requiresHuman =
    snapshot.requiresHumanConfirmation === true ||
    snapshot.needsHumanConfirmation === true ||
    snapshot.status === 'pending_confirmation'
  const checkKey = 'confirmation.boundary'
  const title = 'Human confirmation boundary'
  return {
    checkKey,
    title,
    category: 'confirmation' as const,
    layer: assignLayer(checkKey, title),
    status: requiresHuman ? 'warned' as const : 'passed' as const,
    severity: requiresHuman ? 'high' as const : 'info' as const,
    confidence: 0.85,
    targetField: 'requiresHumanConfirmation',
    evidence: requiresHuman
      ? ['Target indicates human confirmation is required. Eval remains recommendation-only.']
      : ['No human confirmation requirement was detected.'],
    recommendation: requiresHuman
      ? 'Request Kelvin review for this finding. Approval must not mutate target status.'
      : undefined,
  }
}

function targetSpecificCheck(
  targetType: EvalTargetType,
  snapshot: Record<string, unknown>
): EvalCheckDraft {
  if (targetType === 'context_packet') {
    const checkKey = 'context_packet.audit_only'
    const title = 'ContextPacket eval is audit-only'
    return {
      checkKey,
      title,
      category: 'provenance' as const,
      layer: assignLayer(checkKey, title),
      status: 'passed' as const,
      severity: 'info' as const,
      confidence: 0.9,
      targetField: 'contextPacketId',
      evidence: [
        'ContextPacket was evaluated for audit, reproducibility, and selection quality only.',
      ],
      recommendation: undefined,
    }
  }

  if (targetType === 'tool_permission') {
    const decision = stringFrom(snapshot.decision)
    const safeDecision = ['allow_record_only', 'deny', 'requires_human', 'blocked'].includes(decision ?? '')
    const checkKey = 'permission.default_deny'
    const title = 'ToolPermission has no execute decision'
    return {
      checkKey,
      title,
      category: 'permission' as const,
      layer: assignLayer(checkKey, title),
      status: safeDecision ? 'passed' as const : 'blocked' as const,
      severity: safeDecision ? 'info' as const : 'critical' as const,
      confidence: 0.9,
      targetField: 'decision',
      evidence: safeDecision
        ? [`Permission decision is ${decision}.`]
        : ['Permission decision is missing or unsafe.'],
      recommendation: safeDecision ? undefined : 'Block future execution and request Kelvin review.',
    }
  }

  const checkKey = 'target.boundary'
  const title = 'Sprint 7 recommendation-only boundary'
  return {
    checkKey,
    title,
    category: 'regression' as const,
    layer: assignLayer(checkKey, title),
    status: 'passed' as const,
    severity: 'info' as const,
    confidence: 0.9,
    evidence: [`${targetType} eval does not mutate target records.`],
    recommendation: undefined,
  }
}

function findingCategoryFor(category: EvalCheck['category']): EvalFinding['category'] {
  if (category === 'state_machine') return 'state'
  if (category === 'consistency') return 'quality'
  return category as EvalFinding['category']
}

function objectFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function stringFrom(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}
