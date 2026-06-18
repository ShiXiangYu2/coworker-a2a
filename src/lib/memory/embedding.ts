/**
 * Memory Embedding — TF-IDF + 余弦相似度
 *
 * 轻量级语义检索实现，无需外部服务。
 * 适合 MVP 阶段，后续可替换为向量检索。
 *
 * 性能目标：< 200ms 返回结果
 */

import { prisma } from '@/lib/prisma'
import type { AgentId } from '@/lib/agents/types'
import type { MemoryEntry, MemoryEntryKind, MemoryScope } from './types'

// ─── 类型 ────────────────────────────────────────────────────────────

export interface MemorySearchResult {
  entry: MemoryEntry
  score: number
  matchType: 'semantic' | 'keyword' | 'tag'
}

export interface SearchOptions {
  /** 返回结果数量上限 */
  limit?: number
  /** 最小相似度分数 */
  minScore?: number
  /** 按 kind 过滤 */
  kind?: MemoryEntryKind
  /** 按 scope 过滤 */
  scope?: MemoryScope
  /** 按 agentId 过滤 */
  agentId?: AgentId
  /** 按 taskId 过滤 */
  taskId?: string
  /** 按 conversationId 过滤（通过 taskId 关联） */
  conversationId?: string
  /** 只返回活跃状态 */
  activeOnly?: boolean
}

// ─── 文本预处理 ──────────────────────────────────────────────────────

/**
 * 中英文分词 + 停用词过滤
 *
 * 简单实现：按空格/标点分割，过滤短词和停用词。
 */
const STOP_WORDS = new Set([
  // 中文停用词
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '他', '她', '它', '们', '那', '被', '从', '把', '让', '用', '对',
  '为', '以', '与', '及', '或', '但', '而', '如果', '因为', '所以', '虽然', '但是',
  // 英文停用词
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and',
  'or', 'if', 'while', 'this', 'that', 'these', 'those', 'it', 'its',
])

/**
 * 分词：中英文混合分词
 *
 * - 英文：按空格和标点分割
 * - 中文：按字符分割（unigram + bigram）
 */
function tokenize(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w一-鿿\s]/g, ' ') // 保留中文和英文字符
    .replace(/\s+/g, ' ')
    .trim()

  const tokens: string[] = []
  const segments = normalized.split(' ')

  for (const segment of segments) {
    if (!segment) continue

    // 英文单词
    if (/^[a-z]/.test(segment)) {
      if (segment.length > 2 && !STOP_WORDS.has(segment)) {
        tokens.push(segment)
      }
      continue
    }

    // 中文字符
    const chars = [...segment]
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i]
      if (STOP_WORDS.has(char)) continue
      tokens.push(char)

      // bigram
      if (i + 1 < chars.length) {
        const bigram = char + chars[i + 1]
        if (!STOP_WORDS.has(bigram)) {
          tokens.push(bigram)
        }
      }
    }
  }

  return tokens
}

// ─── TF-IDF 计算 ─────────────────────────────────────────────────────

/**
 * 计算词频（TF）
 */
function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1)
  }
  // 归一化
  for (const [key, value] of tf) {
    tf.set(key, value / tokens.length)
  }
  return tf
}

/**
 * 计算逆文档频率（IDF）
 *
 * IDF(t) = log(N / df(t))
 * 其中 N 是文档总数，df(t) 是包含词 t 的文档数
 */
function computeIDF(documents: string[][]): Map<string, number> {
  const N = documents.length
  const df = new Map<string, number>()

  for (const doc of documents) {
    const uniqueTokens = new Set(doc)
    for (const token of uniqueTokens) {
      df.set(token, (df.get(token) ?? 0) + 1)
    }
  }

  const idf = new Map<string, number>()
  for (const [token, freq] of df) {
    idf.set(token, Math.log((N + 1) / (freq + 1)) + 1) // +1 避免除零
  }

  return idf
}

/**
 * 计算 TF-IDF 向量
 */
function computeTFIDF(
  tokens: string[],
  idf: Map<string, number>
): Map<string, number> {
  const tf = computeTF(tokens)
  const tfidf = new Map<string, number>()

  for (const [token, tfValue] of tf) {
    const idfValue = idf.get(token) ?? 1
    tfidf.set(token, tfValue * idfValue)
  }

  return tfidf
}

// ─── 余弦相似度 ──────────────────────────────────────────────────────

/**
 * 计算两个向量的余弦相似度
 */
function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>
): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  // 计算 a 的模
  for (const value of a.values()) {
    normA += value * value
  }
  normA = Math.sqrt(normA)

  // 计算 b 的模
  for (const value of b.values()) {
    normB += value * value
  }
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) return 0

  // 计算点积（只遍历 a 的 key）
  for (const [key, value] of a) {
    const bValue = b.get(key)
    if (bValue !== undefined) {
      dotProduct += value * bValue
    }
  }

  return dotProduct / (normA * normB)
}

// ─── 关键词匹配 ──────────────────────────────────────────────────────

/**
 * 关键词匹配（精确匹配 + 部分匹配）
 */
function keywordScore(query: string, text: string): number {
  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()

  // 精确匹配
  if (textLower.includes(queryLower)) {
    return 1.0
  }

  // 部分匹配
  const queryTokens = tokenize(query)
  const textTokens = new Set(tokenize(text))

  let matches = 0
  for (const token of queryTokens) {
    if (textTokens.has(token)) {
      matches++
    }
  }

  return queryTokens.length > 0 ? matches / queryTokens.length : 0
}

// ─── 标签匹配 ────────────────────────────────────────────────────────

/**
 * 标签匹配
 */
function tagScore(query: string, tags: string[]): number {
  const queryLower = query.toLowerCase()
  const queryTokens = tokenize(query)

  let score = 0
  for (const tag of tags) {
    const tagLower = tag.toLowerCase()
    if (tagLower.includes(queryLower) || queryLower.includes(tagLower)) {
      score += 1.0
    } else {
      // 检查 token 重叠
      const tagTokens = new Set(tokenize(tag))
      for (const token of queryTokens) {
        if (tagTokens.has(token)) {
          score += 0.5
        }
      }
    }
  }

  return tags.length > 0 ? Math.min(score / tags.length, 1.0) : 0
}

// ─── 主搜索函数 ──────────────────────────────────────────────────────

/**
 * 语义检索记忆
 *
 * 使用 TF-IDF + 余弦相似度进行语义匹配，
 * 同时支持关键词匹配和标签匹配。
 */
export async function searchMemory(
  query: string,
  options: SearchOptions = {}
): Promise<MemorySearchResult[]> {
  const {
    limit = 10,
    minScore = 0.1,
    kind,
    scope,
    agentId,
    taskId,
    conversationId,
    activeOnly = true,
  } = options

  // 1. 查询候选记忆
  const where: Record<string, unknown> = {}

  if (activeOnly) {
    where.status = 'active'
  }
  if (kind) {
    where.kind = kind
  }
  if (scope) {
    where.scope = scope
  }
  if (agentId) {
    where.agentId = agentId
  }
  if (taskId) {
    where.taskId = taskId
  }
  if (conversationId) {
    where.task = { conversationId }
  }

  const candidates = await prisma.memoryEntry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100, // 先取 100 条，再排序
  })

  if (candidates.length === 0) return []

  // 2. 计算相似度
  const queryTokens = tokenize(query)
  const queryTF = computeTF(queryTokens)

  // 构建所有候选文档的 token 列表
  const docTokenLists = candidates.map((entry) => {
    const text = `${entry.title} ${entry.content}`
    return tokenize(text)
  })

  // 计算 IDF
  const idf = computeIDF([queryTokens, ...docTokenLists])

  // 计算查询的 TF-IDF
  const queryTFIDF = computeTFIDF(queryTokens, idf)

  // 3. 对每个候选计算综合分数
  const results: MemorySearchResult[] = []

  for (let i = 0; i < candidates.length; i++) {
    const entry = candidates[i]
    const entryText = `${entry.title} ${entry.content}`
    const entryTokens = docTokenLists[i]

    // TF-IDF 语义分数
    const entryTFIDF = computeTFIDF(entryTokens, idf)
    const semanticScore = cosineSimilarity(queryTFIDF, entryTFIDF)

    // 关键词匹配分数
    const kwScore = keywordScore(query, entryText)

    // 标签匹配分数
    const tags: string[] = (() => {
      try { return JSON.parse(entry.tagsJson) } catch { return [] }
    })()
    const tagSc = tagScore(query, tags)

    // 综合分数（加权平均）
    const score = semanticScore * 0.5 + kwScore * 0.3 + tagSc * 0.2

    if (score >= minScore) {
      // 确定匹配类型
      let matchType: MemorySearchResult['matchType'] = 'semantic'
      if (kwScore > semanticScore && kwScore > tagSc) {
        matchType = 'keyword'
      } else if (tagSc > semanticScore) {
        matchType = 'tag'
      }

      results.push({
        entry: serializeMemoryEntry(entry),
        score,
        matchType,
      })
    }
  }

  // 4. 按分数排序，返回 top N
  results.sort((a, b) => b.score - a.score)
  return results.slice(0, limit)
}

// ─── 序列化 ──────────────────────────────────────────────────────────

function serializeMemoryEntry(record: {
  id: string
  idempotencyKey: string | null
  status: string
  title: string
  content: string
  kind: string
  scope: string
  projectId: string | null
  taskId: string | null
  agentRunId: string | null
  agentId: string | null
  sourceType: string
  sourceId: string | null
  sourceSnapshotJson: string | null
  confidence: number
  tagsJson: string
  supersedesMemoryEntryId: string | null
  supersededByMemoryEntryId: string | null
  proposedBy: string
  reviewedBy: string | null
  reviewedAt: Date | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}): MemoryEntry {
  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey ?? undefined,
    status: record.status as MemoryEntry['status'],
    title: record.title,
    content: record.content,
    kind: record.kind as MemoryEntry['kind'],
    scope: record.scope as MemoryEntry['scope'],
    projectId: record.projectId ?? undefined,
    taskId: record.taskId ?? undefined,
    agentRunId: record.agentRunId ?? undefined,
    agentId: (record.agentId as AgentId) ?? undefined,
    sourceType: record.sourceType as MemoryEntry['sourceType'],
    sourceId: record.sourceId ?? undefined,
    sourceSnapshot: record.sourceSnapshotJson
      ? JSON.parse(record.sourceSnapshotJson)
      : undefined,
    confidence: record.confidence,
    tags: JSON.parse(record.tagsJson ?? '[]'),
    supersedesMemoryEntryId: record.supersedesMemoryEntryId ?? undefined,
    supersededByMemoryEntryId: record.supersededByMemoryEntryId ?? undefined,
    proposedBy: record.proposedBy as MemoryEntry['proposedBy'],
    reviewedBy: record.reviewedBy ?? undefined,
    reviewedAt: record.reviewedAt?.toISOString(),
    rejectionReason: record.rejectionReason ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}
