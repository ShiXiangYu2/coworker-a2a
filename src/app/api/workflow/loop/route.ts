/**
 * POST /api/workflow/loop — 启动自治循环
 * GET /api/workflow/loop — 查询循环状态
 *
 * 安全：循环状态仅存储在内存中（MVP 阶段）。
 * 生产环境应持久化到数据库。
 */

import { runLoop, type LoopRunResult } from '@/lib/workflow/loop-engine'
import { DEFAULT_LOOP_CONFIG, type LoopConfig } from '@/lib/workflow/loop-state'

// ─── 内存存储（MVP 阶段） ───────────────────────────────────────────

const loopResults = new Map<string, LoopRunResult>()

// ─── POST — 启动循环 ────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    // 解析配置
    const config: LoopConfig = {
      maxIterations: body.maxIterations ?? DEFAULT_LOOP_CONFIG.maxIterations,
      maxConcurrent: body.maxConcurrent ?? DEFAULT_LOOP_CONFIG.maxConcurrent,
      timeoutMs: body.timeoutMs ?? DEFAULT_LOOP_CONFIG.timeoutMs,
      retryAttempts: body.retryAttempts ?? DEFAULT_LOOP_CONFIG.retryAttempts,
      humanGateOnFailure: body.humanGateOnFailure ?? DEFAULT_LOOP_CONFIG.humanGateOnFailure,
    }

    // 运行循环
    const result = await runLoop(config)

    // 存储结果
    loopResults.set(result.state.loopId, result)

    return Response.json({
      ok: true,
      data: {
        loopId: result.state.loopId,
        state: result.state,
        iterations: result.iterations.length,
        summary: {
          tasksProcessed: result.state.tasksProcessed,
          tasksSucceeded: result.state.tasksSucceeded,
          tasksFailed: result.state.tasksFailed,
          tasksBlocked: result.state.tasksBlocked,
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Loop API] Error:', message)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

// ─── GET — 查询循环状态 ──────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const loopId = url.searchParams.get('id')

    if (loopId) {
      const result = loopResults.get(loopId)
      if (!result) {
        return Response.json({ ok: false, error: 'Loop not found' }, { status: 404 })
      }
      return Response.json({
        ok: true,
        data: {
          loopId: result.state.loopId,
          state: result.state,
          iterations: result.iterations.length,
        },
      })
    }

    // 返回所有循环列表
    const loops = Array.from(loopResults.values()).map((r) => ({
      loopId: r.state.loopId,
      status: r.state.status,
      tasksProcessed: r.state.tasksProcessed,
      tasksSucceeded: r.state.tasksSucceeded,
      startedAt: r.state.startedAt,
      completedAt: r.state.completedAt,
    }))

    return Response.json({ ok: true, data: loops })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
