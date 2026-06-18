/**
 * Tool Run Execution API
 *
 * POST /api/tool-runs/execute — 执行已审批的 ToolRun
 * GET /api/tool-runs/execute — 列出待执行的 ToolRun
 */

import { NextRequest } from 'next/server'
import { executeApprovedToolRun, listPendingExecutions } from '@/lib/tools/human-gated-execution'

export async function GET() {
  try {
    const pending = await listPendingExecutions()
    return Response.json({ ok: true, data: pending })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { toolRunId, cwd, timeoutMs, maxOutputChars } = body

    if (!toolRunId || typeof toolRunId !== 'string') {
      return Response.json(
        { ok: false, error: 'toolRunId is required.' },
        { status: 400 }
      )
    }

    const result = await executeApprovedToolRun(toolRunId, {
      cwd,
      timeoutMs,
      maxOutputChars,
    })

    return Response.json({ ok: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
