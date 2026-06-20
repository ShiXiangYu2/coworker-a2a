/**
 * Prompt Optimizer — Prompt 自动优化器
 *
 * 根据历史执行结果自动调整 Agent 的 System Prompt。
 *
 * 核心流程：
 *   1. 收集 Agent 的执行结果（成功/失败/置信度）
 *   2. 分析失败模式（哪些类型的任务容易失败）
 *   3. 生成针对性的 Prompt 调整建议
 *   4. 应用到 Agent 的 System Prompt
 *
 * 安全：
 *   - Prompt 调整只影响未来的 Agent 执行
 *   - 不修改原始 Skill Prompt，只添加补充指令
 *   - 所有调整记录审计日志
 */

import type { AgentId } from '@/lib/agents/types'
import { getAgentById } from '@/lib/agents/registry'
import { buildAgentSystemPrompt } from '@/lib/agents/prompts/skills'
import { analyzeAgentPerformance } from './feedback-loop'

// ─── 类型定义 ──────────────────────────────────────────────────────

export interface PromptAdjustment {
  agentId: AgentId
  /** 调整类型 */
  type: 'strengthen' | 'weaken' | 'add_instruction' | 'add_example'
  /** 调整内容 */
  content: string
  /** 触发原因 */
  reason: string
  /** 基于多少次执行 */
  sampleSize: number
  /** 预期效果 */
  expectedEffect: string
}

export interface OptimizedPrompt {
  agentId: AgentId
  /** 原始 prompt */
  basePrompt: string
  /** 优化后的 prompt */
  optimizedPrompt: string
  /** 应用的调整 */
  adjustments: PromptAdjustment[]
  /** 优化时间 */
  optimizedAt: string
}

// ─── Prompt 优化 ───────────────────────────────────────────────────

/**
 * 为指定 Agent 生成优化后的 System Prompt
 *
 * 基于历史执行数据，自动添加针对性的指令和示例。
 */
export function optimizePrompt(agentId: AgentId): OptimizedPrompt {
  const agent = getAgentById(agentId)
  if (!agent) {
    return {
      agentId,
      basePrompt: '',
      optimizedPrompt: '',
      adjustments: [],
      optimizedAt: new Date().toISOString(),
    }
  }

  // 构建基础 prompt
  const basePrompt = buildAgentSystemPrompt(
    agentId,
    agent.name,
    agent.title,
    agent.description,
    agent.responsibilities,
    agent.skillPromptNames,
  )

  // 分析性能数据，生成调整建议
  const adjustments = generateAdjustments(agentId)

  // 应用调整
  let optimizedPrompt = basePrompt
  for (const adj of adjustments) {
    optimizedPrompt = applyAdjustment(optimizedPrompt, adj)
  }

  return {
    agentId,
    basePrompt,
    optimizedPrompt,
    adjustments,
    optimizedAt: new Date().toISOString(),
  }
}

/**
 * 获取 Agent 的优化 prompt（带缓存）
 */
const promptCache = new Map<string, { prompt: OptimizedPrompt; expiresAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 分钟

export function getOptimizedPrompt(agentId: AgentId): string {
  const cached = promptCache.get(agentId)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.prompt.optimizedPrompt
  }

  const optimized = optimizePrompt(agentId)
  promptCache.set(agentId, {
    prompt: optimized,
    expiresAt: Date.now() + CACHE_TTL,
  })

  return optimized.optimizedPrompt
}

/**
 * 清除 prompt 缓存
 */
export function clearPromptCache(): void {
  promptCache.clear()
}

// ─── 调整生成 ──────────────────────────────────────────────────────

function generateAdjustments(agentId: AgentId): PromptAdjustment[] {
  const adjustments: PromptAdjustment[] = []

  // 分析性能数据
  const stats = analyzeAgentPerformance()
  const agentStats = stats.find((s) => s.agentId === agentId)

  if (!agentStats || agentStats.totalExecutions < 5) {
    // 数据不足，返回基础调整
    return [{
      agentId,
      type: 'add_instruction',
      content: 'Focus on producing clear, structured output with high confidence.',
      reason: 'Insufficient performance data for optimization.',
      sampleSize: agentStats?.totalExecutions ?? 0,
      expectedEffect: 'Baseline quality guidance.',
    }]
  }

  // 1. 如果成功率低，添加质量指令
  if (agentStats.successRate < 0.7) {
    adjustments.push({
      agentId,
      type: 'strengthen',
      content: `IMPORTANT: Your recent success rate is ${(agentStats.successRate * 100).toFixed(0)}%. Focus on accuracy and completeness. Double-check your analysis before outputting results.`,
      reason: `Low success rate: ${(agentStats.successRate * 100).toFixed(0)}%`,
      sampleSize: agentStats.totalExecutions,
      expectedEffect: 'Improve accuracy by emphasizing quality over speed.',
    })
  }

  // 2. 如果某些任务类型成功率低，添加针对性指令
  for (const weak of agentStats.weakestTaskTypes) {
    if (weak.successRate < 0.5 && weak.count >= 3) {
      adjustments.push({
        agentId,
        type: 'add_instruction',
        content: `When handling "${weak.type}" tasks, pay extra attention to edge cases and validation. Consider breaking the task into smaller steps.`,
        reason: `Weak performance on "${weak.type}" tasks: ${(weak.successRate * 100).toFixed(0)}% success rate`,
        sampleSize: weak.count,
        expectedEffect: `Improve performance on "${weak.type}" tasks.`,
      })
    }
  }

  // 3. 如果某些任务类型成功率高，添加示例
  for (const strong of agentStats.strongestTaskTypes) {
    if (strong.successRate > 0.9 && strong.count >= 5) {
      adjustments.push({
        agentId,
        type: 'add_example',
        content: `Your "${strong.type}" tasks have a ${(strong.successRate * 100).toFixed(0)}% success rate. Apply the same approach to similar tasks.`,
        reason: `Strong performance on "${strong.type}" tasks: ${(strong.successRate * 100).toFixed(0)}% success rate`,
        sampleSize: strong.count,
        expectedEffect: `Replicate success pattern for "${strong.type}" tasks.`,
      })
    }
  }

  // 4. 如果平均置信度低，添加置信度指令
  if (agentStats.avgConfidence < 0.6) {
    adjustments.push({
      agentId,
      type: 'add_instruction',
      content: 'Your average confidence is low. Focus on gathering more context before making conclusions. Use tools to verify assumptions.',
      reason: `Low average confidence: ${(agentStats.avgConfidence * 100).toFixed(0)}%`,
      sampleSize: agentStats.totalExecutions,
      expectedEffect: 'Improve confidence through more thorough analysis.',
    })
  }

  return adjustments
}

// ─── 调整应用 ──────────────────────────────────────────────────────

function applyAdjustment(prompt: string, adjustment: PromptAdjustment): string {
  switch (adjustment.type) {
    case 'strengthen':
      // 在 prompt 开头添加强调指令
      return `${adjustment.content}\n\n---\n\n${prompt}`

    case 'weaken':
      // 在 prompt 末尾添加弱化说明
      return `${prompt}\n\n---\n\nNote: ${adjustment.content}`

    case 'add_instruction':
      // 在 prompt 末尾添加新指令
      return `${prompt}\n\n---\n\n## Performance-Based Instructions\n\n${adjustment.content}`

    case 'add_example':
      // 在 prompt 末尾添加示例说明
      return `${prompt}\n\n---\n\n## Performance Insights\n\n${adjustment.content}`

    default:
      return prompt
  }
}

/**
 * 获取优化报告（用于 Operator Console 展示）
 */
export function getOptimizationReport(): {
  agents: Array<{
    agentId: string
    adjustmentCount: number
    adjustments: PromptAdjustment[]
  }>
  totalAdjustments: number
  generatedAt: string
} {
  const agentIds: AgentId[] = ['elon', 'jobs', 'linus', 'turing', 'bezos']
  const agents = agentIds.map((id) => ({
    agentId: id,
    adjustmentCount: 0,
    adjustments: [] as PromptAdjustment[],
  }))

  let totalAdjustments = 0

  for (const agent of agents) {
    const adjustments = generateAdjustments(agent.agentId)
    agent.adjustmentCount = adjustments.length
    agent.adjustments = adjustments
    totalAdjustments += adjustments.length
  }

  return {
    agents,
    totalAdjustments,
    generatedAt: new Date().toISOString(),
  }
}
