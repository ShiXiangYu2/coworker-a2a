/**
 * Monitoring API — 监控 API
 *
 * GET /api/monitoring
 *
 * 返回系统监控数据：健康状态、指标、成本、预算。
 * 用于 Operator Console 和外部监控系统。
 */

import { getMonitoringData, checkSystemHealth, getMetricsSummary, checkBudget } from '@/lib/monitoring'
import { withAuth } from '@/lib/auth/middleware'

export const GET = withAuth(async (request) => {
  const url = new URL(request.url)
  const view = url.searchParams.get('view') ?? 'full'

  try {
    switch (view) {
      case 'full': {
        const data = await getMonitoringData()
        return Response.json({ ok: true, data })
      }

      case 'health': {
        const health = await checkSystemHealth()
        return Response.json({ ok: true, data: health })
      }

      case 'metrics': {
        const metrics = getMetricsSummary()
        return Response.json({ ok: true, data: metrics })
      }

      case 'budget': {
        const budget = await checkBudget()
        return Response.json({ ok: true, data: budget })
      }

      default:
        return Response.json(
          { ok: false, error: `Unknown view: ${view}` },
          { status: 400 }
        )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
})
