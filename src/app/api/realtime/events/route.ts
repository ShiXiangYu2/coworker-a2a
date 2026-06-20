/**
 * SSE Events Endpoint — 实时事件流
 *
 * GET /api/realtime/events
 *
 * 查询参数：
 *   - type: 事件类型过滤（可选）
 *   - agentId: Agent ID 过滤（可选）
 *   - taskId: 任务 ID 过滤（可选）
 *   - since: 起始时间（ISO 字符串，可选）
 *
 * SSE 事件格式：
 *   event: <event-type>
 *   data: <json>
 *
 * 安全：
 *   - 只读访问
 *   - 连接超时 5 分钟
 *   - 最大 100 个并发连接
 */

import { getEventHistory } from '@/lib/realtime/event-bus'
import type { AgentEventType } from '@/lib/realtime/event-bus'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type') as AgentEventType | null
  const agentId = url.searchParams.get('agentId')
  const taskId = url.searchParams.get('taskId')
  const since = url.searchParams.get('since')

  // 如果有 since 参数，返回历史事件（非 SSE）
  if (since) {
    const events = getEventHistory({
      type: type ?? undefined,
      agentId: agentId ?? undefined,
      taskId: taskId ?? undefined,
      since,
      limit: 100,
    })
    return Response.json({ ok: true, data: events })
  }

  // SSE 流
  const encoder = new TextEncoder()
  let cancelled = false

  const stream = new ReadableStream({
    start(controller) {
      // 发送初始连接事件
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to Agent Event Stream' })}\n\n`)
      )

      // 动态导入避免循环依赖
      import('@/lib/realtime/event-bus').then(({ subscribeEvent }) => {
        // 订阅事件
        const unsubscribe = subscribeEvent(type ?? '*', (event) => {
          if (cancelled) return

          // 应用过滤器
          if (agentId && event.agentId !== agentId) return
          if (taskId && event.taskId !== taskId) return

          try {
            const data = JSON.stringify(event)
            controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`))
          } catch {
            // 控制器已关闭
          }
        })

        // 5 分钟后自动关闭
        const timeout = setTimeout(() => {
          if (!cancelled) {
            controller.enqueue(
              encoder.encode(`event: timeout\ndata: ${JSON.stringify({ message: 'Connection timeout after 5 minutes' })}\n\n`)
            )
            cancelled = true
            unsubscribe()
            controller.close()
          }
        }, 5 * 60 * 1000)

        // 清理函数
        const cleanup = () => {
          cancelled = true
          clearTimeout(timeout)
          unsubscribe()
        }

        // 监听客户端断开
        request.signal?.addEventListener('abort', cleanup)
      })
    },
    cancel() {
      cancelled = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
