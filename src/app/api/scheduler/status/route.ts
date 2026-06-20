/**
 * Scheduler Status API — 调度器状态 API
 *
 * GET /api/scheduler/status
 *
 * 返回调度器完整状态：队列、预算、成本。
 * 用于 Operator Console 监控。
 */

import { getSchedulerStatus } from '@/lib/scheduler/scheduler'

export async function GET() {
  const status = getSchedulerStatus()
  return Response.json({ ok: true, data: status })
}
