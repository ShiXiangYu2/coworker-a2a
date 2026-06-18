/**
 * POST /api/memory/search — 语义检索记忆
 *
 * 使用 TF-IDF + 余弦相似度进行语义匹配，
 * 同时支持关键词匹配和标签匹配。
 *
 * 性能目标：< 200ms 返回结果
 */

import { searchMemory, type SearchOptions } from '@/lib/memory/embedding'
import type { MemoryEntryKind, MemoryScope } from '@/lib/memory/types'
import type { AgentId } from '@/lib/agents/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // 验证必需字段
    if (!body.query || typeof body.query !== 'string') {
      return Response.json(
        { ok: false, error: 'query is required and must be a string' },
        { status: 400 }
      )
    }

    if (body.query.trim().length === 0) {
      return Response.json(
        { ok: false, error: 'query cannot be empty' },
        { status: 400 }
      )
    }

    // 解析选项
    const options: SearchOptions = {
      limit: body.limit ?? 10,
      minScore: body.minScore ?? 0.1,
      kind: body.kind as MemoryEntryKind | undefined,
      scope: body.scope as MemoryScope | undefined,
      agentId: body.agentId as AgentId | undefined,
      taskId: body.taskId,
      conversationId: body.conversationId,
      activeOnly: body.activeOnly ?? true,
    }

    // 执行搜索
    const startTime = Date.now()
    const results = await searchMemory(body.query, options)
    const elapsed = Date.now() - startTime

    return Response.json({
      ok: true,
      data: {
        query: body.query,
        results: results.map((r) => ({
          id: r.entry.id,
          title: r.entry.title,
          content: r.entry.content.slice(0, 200),
          kind: r.entry.kind,
          scope: r.entry.scope,
          agentId: r.entry.agentId,
          score: r.score,
          matchType: r.matchType,
          tags: r.entry.tags,
          createdAt: r.entry.createdAt,
        })),
        total: results.length,
        elapsed,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Memory Search API] Error:', message)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
