/**
 * HARNESS Task Graph API — 线程地图 API
 *
 * GET /api/operator/harness-task-graph
 *
 * 返回任务关系图谱：节点和边。
 */

import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 获取最近的任务
    const tasks = await prisma.harmonyTask.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 30,
      select: {
        id: true,
        title: true,
        status: true,
        targetAgentId: true,
        createdAt: true,
      },
    })

    // 构建节点
    const nodes = tasks.map((t) => ({
      id: t.id,
      title: t.title.slice(0, 50),
      type: 'task' as const,
      status: mapStatus(t.status),
      agentId: t.targetAgentId ?? undefined,
      timestamp: t.createdAt.toISOString(),
    }))

    // 获取最近的 AgentRun
    const agentRuns = await prisma.agentRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        taskId: true,
        agentId: true,
        status: true,
        createdAt: true,
      },
    })

    const agentRunNodes = agentRuns.map((r) => ({
      id: r.id,
      title: `Agent Run: ${r.agentId}`,
      type: 'agent_run' as const,
      status: mapStatus(r.status),
      agentId: r.agentId,
      timestamp: r.createdAt.toISOString(),
    }))

    // 获取最近的 ToolCall
    const toolCalls = await prisma.toolCall.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        id: true,
        toolName: true,
        status: true,
        createdAt: true,
      },
    })

    const toolCallNodes = toolCalls.map((c) => ({
      id: c.id,
      title: `Tool: ${c.toolName}`,
      type: 'tool_call' as const,
      status: mapStatus(c.status),
      timestamp: c.createdAt.toISOString(),
    }))

    // 构建边（简化：任务 → AgentRun → ToolCall）
    const edges: Array<{ from: string; to: string; type: string }> = []

    for (const run of agentRuns) {
      if (run.taskId && tasks.some((t) => t.id === run.taskId)) {
        edges.push({ from: run.taskId, to: run.id, type: 'triggers' })
      }
    }

    // 统计
    const allNodes = [...nodes, ...agentRunNodes, ...toolCallNodes]
    const summary = {
      totalNodes: allNodes.length,
      completedNodes: allNodes.filter((n) => n.status === 'completed').length,
      failedNodes: allNodes.filter((n) => n.status === 'failed').length,
      blockedNodes: allNodes.filter((n) => n.status === 'blocked').length,
    }

    return Response.json({
      ok: true,
      data: {
        nodes: allNodes,
        edges,
        summary,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

function mapStatus(status: string): 'pending' | 'running' | 'completed' | 'failed' | 'blocked' {
  switch (status) {
    case 'queued':
    case 'created':
    case 'draft': return 'pending'
    case 'running':
    case 'active':
    case 'in_progress': return 'running'
    case 'completed':
    case 'done':
    case 'merged': return 'completed'
    case 'failed':
    case 'error': return 'failed'
    case 'blocked':
    case 'pending_confirmation': return 'blocked'
    default: return 'pending'
  }
}
