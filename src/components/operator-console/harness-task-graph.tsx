'use client'

/**
 * HARNESS Task Graph — 线程地图/任务图谱视图
 *
 * 展示任务从用户请求到执行回执的关系链：
 * - 节点和边表达分叉、汇合、阻塞、完成
 * - DAG 式时间线和节点列表混合视图
 * - 任务依赖关系可视化
 */

import { useState, useEffect } from 'react'

interface TaskNode {
  id: string
  title: string
  type: 'task' | 'agent_run' | 'tool_call' | 'review' | 'decision'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked'
  agentId?: string
  timestamp: string
}

interface TaskEdge {
  from: string
  to: string
  type: 'depends_on' | 'triggers' | 'reviews' | 'blocks'
}

interface TaskGraphData {
  nodes: TaskNode[]
  edges: TaskEdge[]
  summary: {
    totalNodes: number
    completedNodes: number
    failedNodes: number
    blockedNodes: number
  }
}

const NODE_COLORS: Record<string, string> = {
  task: 'bg-blue-500',
  agent_run: 'bg-green-500',
  tool_call: 'bg-yellow-500',
  review: 'bg-purple-500',
  decision: 'bg-red-500',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'border-gray-300',
  running: 'border-blue-400',
  completed: 'border-green-400',
  failed: 'border-red-400',
  blocked: 'border-yellow-400',
}

const STATUS_ICONS: Record<string, string> = {
  pending: '⏳',
  running: '⚡',
  completed: '✅',
  failed: '❌',
  blocked: '🚫',
}

export function HarnessTaskGraph() {
  const [data, setData] = useState<TaskGraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/operator/harness-task-graph')
        const json = await res.json()
        if (!cancelled && json.ok) setData(json.data)
      } catch {
        if (!cancelled) setData({ nodes: [], edges: [], summary: { totalNodes: 0, completedNodes: 0, failedNodes: 0, blockedNodes: 0 } })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) return <div className="p-6 text-gray-500">Loading task graph...</div>

  return (
    <div className="space-y-6">
      {/* 摘要统计 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{data?.summary.totalNodes ?? 0}</div>
          <div className="text-sm text-gray-500">总节点</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{data?.summary.completedNodes ?? 0}</div>
          <div className="text-sm text-gray-500">已完成</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{data?.summary.failedNodes ?? 0}</div>
          <div className="text-sm text-gray-500">已失败</div>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{data?.summary.blockedNodes ?? 0}</div>
          <div className="text-sm text-gray-500">已阻塞</div>
        </div>
      </div>

      {/* 图谱视图 */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">🔗 任务关系图谱</h3>

        {data?.nodes.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <div className="text-4xl mb-2">📭</div>
            <div>暂无任务数据</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 节点列表 */}
            <div className="space-y-2">
              {data?.nodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                    selectedNode === node.id ? 'border-blue-400 bg-blue-50' : STATUS_COLORS[node.status]
                  } hover:bg-gray-50`}
                >
                  <div className={`w-3 h-3 rounded-full ${NODE_COLORS[node.type]}`} />
                  <span className="text-lg">{STATUS_ICONS[node.status]}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{node.title}</div>
                    <div className="text-xs text-gray-400">
                      {node.type} {node.agentId ? `• ${node.agentId}` : ''} • {new Date(node.timestamp).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 边列表 */}
            {data?.edges && data.edges.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-500 mb-3">关系边</h4>
                <div className="space-y-1">
                  {data.edges.slice(0, 20).map((edge, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-mono bg-gray-100 px-1 rounded">{edge.from.slice(0, 8)}</span>
                      <span>→</span>
                      <span className="font-mono bg-gray-100 px-1 rounded">{edge.to.slice(0, 8)}</span>
                      <span className="text-gray-400">({edge.type})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
