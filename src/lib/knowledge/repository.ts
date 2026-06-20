/**
 * Knowledge Repository — 系统经验库
 *
 * 管理系统经验知识：
 *   - CRUD 操作
 *   - 语义搜索
 *   - 使用统计
 *   - 知识关联
 */

import { prisma } from '@/lib/prisma'
import type { KnowledgeEntry, KnowledgeType, KnowledgeQuery, KnowledgeSearchResult, KnowledgeStats } from './types'

// ─── CRUD 操作 ──────────────────────────────────────────────────────

/**
 * 创建知识条目
 */
export async function createKnowledge(input: {
  type: KnowledgeType
  title: string
  content: string
  tags?: string[]
  source?: string
  applicableTo?: string[]
  confidence?: number
}): Promise<KnowledgeEntry> {
  const record = await prisma.knowledgeItem.create({
    data: {
      status: 'active',
      title: input.title,
      content: input.content,
      kind: input.type,
      scope: 'project',
      sourceType: input.source ?? 'system',
      tagsJson: JSON.stringify(input.tags ?? []),
      version: 1,
      createdBy: 'system',
    },
  })

  return serializeKnowledge(record)
}

/**
 * 获取知识条目
 */
export async function getKnowledge(id: string): Promise<KnowledgeEntry | null> {
  const record = await prisma.knowledgeItem.findUnique({ where: { id } })
  return record ? serializeKnowledge(record) : null
}

/**
 * 更新知识条目
 */
export async function updateKnowledge(
  id: string,
  updates: Partial<Pick<KnowledgeEntry, 'title' | 'content' | 'tags' | 'status' | 'confidence'>>,
): Promise<KnowledgeEntry | null> {
  const data: Record<string, unknown> = {}
  if (updates.title !== undefined) data.title = updates.title
  if (updates.content !== undefined) data.content = updates.content
  if (updates.tags !== undefined) data.tagsJson = JSON.stringify(updates.tags)
  if (updates.status !== undefined) data.status = updates.status
  if (updates.confidence !== undefined) data.confidence = updates.confidence

  const record = await prisma.knowledgeItem.update({
    where: { id },
    data,
  })

  return serializeKnowledge(record)
}

/**
 * 删除知识条目
 */
export async function deleteKnowledge(id: string): Promise<boolean> {
  try {
    await prisma.knowledgeItem.delete({ where: { id } })
    return true
  } catch {
    return false
  }
}

// ─── 搜索 ──────────────────────────────────────────────────────────

/**
 * 搜索知识条目
 */
export async function searchKnowledge(
  query: KnowledgeQuery,
): Promise<KnowledgeSearchResult[]> {
  const where: Record<string, unknown> = { status: 'active' }

  if (query.type) where.kind = query.type
  if (query.source) where.sourceType = query.source
  if (query.minConfidence) where.confidence = { gte: query.minConfidence }

  const records = await prisma.knowledgeItem.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 20,
  })

  // 简单的关键词匹配评分
  const results: KnowledgeSearchResult[] = []

  for (const record of records) {
    const entry = serializeKnowledge(record)
    let score = 0
    let matchType: KnowledgeSearchResult['matchType'] = 'keyword'

    // 标题匹配
    if (query.text && entry.title.toLowerCase().includes(query.text.toLowerCase())) {
      score += 0.5
    }

    // 内容匹配
    if (query.text && entry.content.toLowerCase().includes(query.text.toLowerCase())) {
      score += 0.3
    }

    // 标签匹配
    if (query.tags) {
      const tagMatches = query.tags.filter((t) => entry.tags.includes(t))
      if (tagMatches.length > 0) {
        score += 0.2 * (tagMatches.length / query.tags.length)
        matchType = 'tag'
      }
    }

    // 类型匹配
    if (query.type && entry.type === query.type) {
      score += 0.1
      matchType = 'type'
    }

    // 置信度加权
    score *= entry.confidence

    // 使用次数加权
    if (entry.usageCount > 0) {
      score *= Math.min(1 + entry.usageCount * 0.05, 1.5)
    }

    if (score > 0 || !query.text) {
      results.push({ entry, score, matchType })
    }
  }

  return results.sort((a, b) => b.score - a.score)
}

// ─── 使用统计 ──────────────────────────────────────────────────────

/**
 * 记录知识使用
 */
export async function recordKnowledgeUsage(id: string): Promise<void> {
  try {
    await prisma.knowledgeItem.update({
      where: { id },
      data: { version: { increment: 1 } },
    })
  } catch {
    // 忽略更新失败
  }
}

/**
 * 获取知识统计
 */
export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  const allEntries = await prisma.knowledgeItem.findMany({
    where: { status: 'active' },
  })

  const entries = allEntries.map(serializeKnowledge)

  // 按类型统计
  const byType: Record<KnowledgeType, number> = {
    workflow_template: 0, execution_plan: 0, judgment_pattern: 0,
    debt_case: 0, failure_pattern: 0, fix_pattern: 0,
    evidence_snapshot: 0, best_practice: 0, lesson_learned: 0,
    tool_usage_pattern: 0,
  }
  for (const entry of entries) {
    byType[entry.type] = (byType[entry.type] ?? 0) + 1
  }

  // 按状态统计
  const byStatus: Record<string, number> = {}
  for (const entry of entries) {
    byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1
  }

  // 最常使用
  const topUsed = [...entries]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5)

  // 最近添加
  const recentlyAdded = [...entries]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return {
    totalEntries: entries.length,
    byType,
    byStatus,
    topUsed,
    recentlyAdded,
  }
}

// ─── 序列化 ────────────────────────────────────────────────────────

function serializeKnowledge(record: {
  id: string
  kind: string
  title: string
  content: string
  tagsJson: string
  sourceType: string
  version: number
  status: string
  createdAt: Date
  updatedAt: Date
}): KnowledgeEntry {
  return {
    id: record.id,
    type: record.kind as KnowledgeType,
    title: record.title,
    content: record.content,
    tags: JSON.parse(record.tagsJson ?? '[]'),
    source: record.sourceType,
    applicableTo: [],
    usageCount: record.version,
    successRate: 0.8,
    confidence: 0.8,
    status: record.status as KnowledgeEntry['status'],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
