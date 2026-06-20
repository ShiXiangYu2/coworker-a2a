/**
 * Best Practice Extractor — 最佳实践提取器
 *
 * 从成功的 Agent 执行中提取可复用的最佳实践。
 *
 * 核心流程：
 *   1. 收集成功记录
 *   2. 分析成功模式（哪些方法有效）
 *   3. 提取最佳实践（可复用的策略）
 *   4. 暴露给 Agent 使用
 *
 * 安全：
 *   - 只提取模式，不存储原始执行内容
 *   - 最佳实践仅供参考，不强制执行
 */

import type { AgentId } from '@/lib/agents/types'

// ─── 类型定义 ──────────────────────────────────────────────────────

export interface BestPractice {
  id: string
  /** 实践标题 */
  title: string
  /** 实践描述 */
  description: string
  /** 适用的 Agent */
  agentId: AgentId
  /** 适用的任务类型 */
  taskType: string
  /** 成功率 */
  successRate: number
  /** 基于多少次成功执行 */
  sampleSize: number
  /** 策略摘要 */
  strategy: string
  /** 提取时间 */
  extractedAt: string
}

export interface SuccessRecord {
  timestamp: string
  agentId: AgentId
  taskType: string
  /** 执行置信度 */
  confidence: number
  /** 耗时毫秒 */
  durationMs: number
  /** 使用的工具 */
  toolsUsed: string[]
  /** 结果摘要 */
  resultSummary: string
}

// ─── 存储 ──────────────────────────────────────────────────────────

const MAX_RECORDS = 500
const successRecords: SuccessRecord[] = []
const bestPractices = new Map<string, BestPractice>()
let practiceIdCounter = 0

// ─── 记录成功 ──────────────────────────────────────────────────────

/**
 * 记录一次成功执行
 */
export function recordSuccess(
  agentId: AgentId,
  taskType: string,
  confidence: number,
  durationMs: number,
  toolsUsed: string[] = [],
  resultSummary: string = '',
): void {
  const record: SuccessRecord = {
    timestamp: new Date().toISOString(),
    agentId,
    taskType,
    confidence,
    durationMs,
    toolsUsed,
    resultSummary: resultSummary.slice(0, 500),
  }

  successRecords.push(record)

  // 滑动窗口
  if (successRecords.length > MAX_RECORDS) {
    successRecords.shift()
  }

  // 尝试提取最佳实践
  extractBestPractice(agentId, taskType)
}

// ─── 最佳实践提取 ──────────────────────────────────────────────────

function extractBestPractice(agentId: AgentId, taskType: string): void {
  const key = `${agentId}:${taskType}`

  // 收集该组合的成功记录
  const relevantRecords = successRecords.filter(
    (r) => r.agentId === agentId && r.taskType === taskType,
  )

  if (relevantRecords.length < 5) return // 样本不足

  // 计算统计
  const avgConfidence = relevantRecords.reduce((s, r) => s + r.confidence, 0) / relevantRecords.length
  const avgDuration = relevantRecords.reduce((s, r) => s + r.durationMs, 0) / relevantRecords.length

  // 分析工具使用模式
  const toolFrequency = new Map<string, number>()
  for (const record of relevantRecords) {
    for (const tool of record.toolsUsed) {
      toolFrequency.set(tool, (toolFrequency.get(tool) ?? 0) + 1)
    }
  }
  const commonTools = Array.from(toolFrequency.entries())
    .filter(([, count]) => count >= relevantRecords.length * 0.5) // 至少 50% 的执行使用了这个工具
    .map(([tool]) => tool)

  // 分析结果摘要中的共同主题
  const summaryThemes = extractThemes(relevantRecords.map((r) => r.resultSummary))

  // 生成策略
  const strategy = generateStrategy(commonTools, summaryThemes, avgConfidence, avgDuration)

  // 更新或创建最佳实践
  const existing = bestPractices.get(key)
  if (existing) {
    existing.sampleSize = relevantRecords.length
    existing.successRate = avgConfidence
    existing.strategy = strategy
    existing.extractedAt = new Date().toISOString()
  } else {
    bestPractices.set(key, {
      id: `bp-${++practiceIdCounter}`,
      title: `Best practice for ${agentId} on ${taskType} tasks`,
      description: `Extracted from ${relevantRecords.length} successful executions.`,
      agentId,
      taskType,
      successRate: avgConfidence,
      sampleSize: relevantRecords.length,
      strategy,
      extractedAt: new Date().toISOString(),
    })
  }
}

function extractThemes(summaries: string[]): string[] {
  // 简单的关键词频率分析
  const wordFreq = new Map<string, number>()
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and', 'or', 'if', 'while', 'this', 'that', 'these', 'those', 'it', 'its', '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那', '被', '从', '把', '让', '用', '对', '为', '以', '与', '及', '或', '但', '而', '如果', '因为', '所以', '虽然', '但是'])

  for (const summary of summaries) {
    const words = summary.toLowerCase().split(/\s+/)
    for (const word of words) {
      const cleaned = word.replace(/[^\w一-鿿]/g, '')
      if (cleaned.length > 2 && !stopWords.has(cleaned)) {
        wordFreq.set(cleaned, (wordFreq.get(cleaned) ?? 0) + 1)
      }
    }
  }

  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
}

function generateStrategy(
  tools: string[],
  themes: string[],
  avgConfidence: number,
  avgDuration: number,
): string {
  const parts: string[] = []

  if (tools.length > 0) {
    parts.push(`Commonly uses tools: ${tools.join(', ')}`)
  }

  if (themes.length > 0) {
    parts.push(`Key themes in results: ${themes.join(', ')}`)
  }

  parts.push(`Average confidence: ${(avgConfidence * 100).toFixed(0)}%`)

  if (avgDuration < 5000) {
    parts.push('Fast execution (under 5s) - efficient approach')
  } else if (avgDuration > 30000) {
    parts.push('Slower execution (over 30s) - thorough analysis')
  }

  return parts.join('. ') + '.'
}

// ─── 查询 ──────────────────────────────────────────────────────────

/**
 * 获取所有最佳实践
 */
export function getBestPractices(): BestPractice[] {
  return Array.from(bestPractices.values()).sort((a, b) => b.sampleSize - a.sampleSize)
}

/**
 * 获取指定 Agent 的最佳实践
 */
export function getBestPracticesForAgent(agentId: AgentId): BestPractice[] {
  return getBestPractices().filter((bp) => bp.agentId === agentId)
}

/**
 * 获取指定任务类型的最佳实践
 */
export function getBestPracticesForTaskType(taskType: string): BestPractice[] {
  return getBestPractices().filter((bp) => bp.taskType === taskType)
}

/**
 * 获取 Agent 执行建议
 *
 * 基于最佳实践，为 Agent 提供执行建议。
 */
export function getExecutionAdvice(
  agentId: AgentId,
  taskType: string,
): { advice: string; confidence: number } | null {
  const practice = bestPractices.get(`${agentId}:${taskType}`)
  if (!practice || practice.sampleSize < 5) {
    return null
  }

  return {
    advice: practice.strategy,
    confidence: practice.successRate,
  }
}

/**
 * 获取最佳实践摘要
 */
export function getBestPracticeSummary(): {
  totalPractices: number
  byAgent: Record<string, number>
  byTaskType: Record<string, number>
  topPractices: BestPractice[]
} {
  const practices = getBestPractices()
  const byAgent: Record<string, number> = {}
  const byTaskType: Record<string, number> = {}

  for (const bp of practices) {
    byAgent[bp.agentId] = (byAgent[bp.agentId] ?? 0) + 1
    byTaskType[bp.taskType] = (byTaskType[bp.taskType] ?? 0) + 1
  }

  return {
    totalPractices: practices.length,
    byAgent,
    byTaskType,
    topPractices: practices.slice(0, 5),
  }
}

/**
 * 清空记录（仅测试用）
 */
export function clearBestPracticeRecords(): void {
  successRecords.length = 0
  bestPractices.clear()
}
