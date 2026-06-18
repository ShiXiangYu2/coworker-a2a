/**
 * POST /api/workflow/orchestrate — 启动多 Agent 编排
 *
 * 安全：编排结果存储在内存中（MVP 阶段）。
 * 生产环境应持久化到数据库。
 */

import { runOrchestration, type OrchestratorResult } from '@/lib/agent-runtime/orchestrator'
import type { AgentId } from '@/lib/agents/types'

// ─── 内存存储（MVP 阶段） ───────────────────────────────────────────

const orchestrationResults = new Map<string, OrchestratorResult>()

// ─── POST — 启动编排 ────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // 验证必需字段
    if (!body.taskId) {
      return Response.json(
        { ok: false, error: 'taskId is required' },
        { status: 400 }
      )
    }

    if (!body.conversationId) {
      return Response.json(
        { ok: false, error: 'conversationId is required' },
        { status: 400 }
      )
    }

    // 运行编排
    const result = await runOrchestration({
      taskId: body.taskId,
      conversationId: body.conversationId,
      decompositionStrategy: body.decompositionStrategy ?? 'auto',
      maxParallel: body.maxParallel ?? 2,
      summaryAgentId: (body.summaryAgentId as AgentId) ?? 'turing',
      maxRetries: body.maxRetries ?? 1,
    })

    // 存储结果
    orchestrationResults.set(result.orchestrationId, result)

    return Response.json({
      ok: true,
      data: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Orchestrate API] Error:', message)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

// ─── GET — 查询编排状态 ──────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const orchestrationId = url.searchParams.get('id')

    if (orchestrationId) {
      const result = orchestrationResults.get(orchestrationId)
      if (!result) {
        return Response.json({ ok: false, error: 'Orchestration not found' }, { status: 404 })
      }
      return Response.json({ ok: true, data: result })
    }

    // 返回所有编排列表
    const list = Array.from(orchestrationResults.values()).map((r) => ({
      orchestrationId: r.orchestrationId,
      parentTaskId: r.parentTaskId,
      subtasksTotal: r.audit.subtasksTotal,
      subtasksSucceeded: r.audit.subtasksSucceeded,
      overallConfidence: r.overallConfidence,
      needsHumanReview: r.needsHumanReview,
      executionTime: r.audit.executionTime,
    }))

    return Response.json({ ok: true, data: list })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
