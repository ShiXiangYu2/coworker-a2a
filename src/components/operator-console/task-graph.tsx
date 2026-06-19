'use client'

import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, PanelShell, StatusBadge } from './ui'

interface TaskGraphNode {
  id: string
  type: 'user_request' | 'task' | 'agent_run' | 'tool_call' | 'workflow' | 'receipt' | 'review'
  title: string
  status: string
  timestamp: string
  metadata?: Record<string, string | number>
}

interface TaskGraphEdge {
  from: string
  to: string
  type: 'triggers' | 'produces' | 'blocks' | 'completes'
}

interface TaskGraphData {
  taskId: string
  taskTitle: string
  nodes: TaskGraphNode[]
  edges: TaskGraphEdge[]
  summary: {
    totalNodes: number
    blockedNodes: number
    completedNodes: number
    lifecyclePhase: string
  }
}

const nodeTypeColors: Record<string, string> = {
  user_request: 'bg-blue-100 text-blue-700',
  task: 'bg-gray-100 text-gray-700',
  agent_run: 'bg-purple-100 text-purple-700',
  tool_call: 'bg-amber-100 text-amber-700',
  workflow: 'bg-indigo-100 text-indigo-700',
  receipt: 'bg-emerald-100 text-emerald-700',
  review: 'bg-rose-100 text-rose-700',
}

const nodeTypeLabels: Record<string, string> = {
  user_request: '用户请求',
  task: '任务',
  agent_run: 'Agent 运行',
  tool_call: '工具调用',
  workflow: '工作流',
  receipt: '执行回执',
  review: '审查',
}

const edgeTypeLabels: Record<string, string> = {
  triggers: '触发',
  produces: '产生',
  blocks: '阻塞',
  completes: '完成',
}

export function TaskGraph() {
  const [data, setData] = useState<TaskGraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  async function fetchGraphData() {
    try {
      const res = await fetch('/api/operator/task-flows?limit=1')
      if (res.ok) {
        const result = await res.json()
        if (result.ok && result.data?.length > 0) {
          const flow = result.data[0]
          const graphData = convertFlowToGraph(flow)
          setData(graphData)
        }
      }
    } catch {
      // Optional panel
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchGraphData()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  if (loading) {
    return <LoadingState label="正在加载任务图谱..." />
  }

  if (!data) {
    return (
      <PanelShell
        title="任务图谱 Task Graph"
        description="展示任务从用户请求到执行回执的完整关系链。"
      >
        <EmptyState
          title="暂无任务图谱"
          description="当任务流程存在后，这里会展示节点和边的关系图。"
        />
      </PanelShell>
    )
  }

  const selectedNode = data.nodes.find((n) => n.id === selectedNodeId)

  return (
    <PanelShell
      title="任务图谱 Task Graph"
      description={`展示任务「${data.taskTitle}」从用户请求到执行回执的完整关系链。`}
    >
      <div className="space-y-4">
        {/* 图谱摘要 */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
            <div className="text-xs text-gray-500">总节点数</div>
            <div className="mt-1 text-xl font-semibold text-gray-950">{data.summary.totalNodes}</div>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
            <div className="text-xs text-gray-500">已完成</div>
            <div className="mt-1 text-xl font-semibold text-emerald-600">{data.summary.completedNodes}</div>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
            <div className="text-xs text-gray-500">阻塞中</div>
            <div className="mt-1 text-xl font-semibold text-rose-600">{data.summary.blockedNodes}</div>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
            <div className="text-xs text-gray-500">生命周期</div>
            <div className="mt-1 text-sm font-semibold text-gray-950">
              <StatusBadge status={data.summary.lifecyclePhase} />
            </div>
          </div>
        </div>

        {/* 图谱可视化 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-950">关系图</div>
          <div className="mt-4 space-y-2">
            {data.nodes.map((node, index) => (
              <div key={node.id} className="flex items-center gap-3">
                {/* 节点 */}
                <button
                  onClick={() => setSelectedNodeId(selectedNodeId === node.id ? null : node.id)}
                  className={`flex-shrink-0 rounded-lg border p-3 text-left transition-all ${
                    selectedNodeId === node.id
                      ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${nodeTypeColors[node.type]}`}>
                      {nodeTypeLabels[node.type]}
                    </span>
                    <StatusBadge status={node.status} />
                  </div>
                  <div className="mt-1 max-w-xs truncate text-sm font-medium text-gray-900">
                    {node.title}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {new Date(node.timestamp).toLocaleString()}
                  </div>
                </button>

                {/* 连接线 */}
                {index < data.nodes.length - 1 && (
                  <div className="flex flex-col items-center">
                    <div className="h-4 w-0.5 bg-gray-300" />
                    <div className="text-xs text-gray-400">↓</div>
                    <div className="h-4 w-0.5 bg-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 选中节点详情 */}
        {selectedNode && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="text-sm font-semibold text-blue-900">节点详情</div>
            <div className="mt-2 space-y-2">
              <div>
                <span className="text-xs text-blue-600">类型：</span>
                <span className="text-sm text-blue-900">{nodeTypeLabels[selectedNode.type]}</span>
              </div>
              <div>
                <span className="text-xs text-blue-600">标题：</span>
                <span className="text-sm text-blue-900">{selectedNode.title}</span>
              </div>
              <div>
                <span className="text-xs text-blue-600">状态：</span>
                <StatusBadge status={selectedNode.status} />
              </div>
              <div>
                <span className="text-xs text-blue-600">时间：</span>
                <span className="text-sm text-blue-900">{new Date(selectedNode.timestamp).toLocaleString()}</span>
              </div>
              {selectedNode.metadata && (
                <div>
                  <span className="text-xs text-blue-600">元数据：</span>
                  <pre className="mt-1 overflow-x-auto rounded bg-white p-2 text-xs text-gray-700">
                    {JSON.stringify(selectedNode.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 边列表 */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-gray-950">关系列表</div>
          <div className="mt-3 space-y-2">
            {data.edges.map((edge, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="truncate text-gray-600">
                  {data.nodes.find((n) => n.id === edge.from)?.title ?? edge.from}
                </span>
                <span className="flex-shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {edgeTypeLabels[edge.type]}
                </span>
                <span className="truncate text-gray-600">
                  {data.nodes.find((n) => n.id === edge.to)?.title ?? edge.to}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PanelShell>
  )
}

function convertFlowToGraph(flow: {
  taskId: string
  title: string
  status: string
  lifecycle: { phase: string }
  nodes: Array<{
    id: string
    type: string
    title: string
    status: string
    createdAt?: string
    meta?: Record<string, string | number | boolean | null>
  }>
}): TaskGraphData {
  const nodes: TaskGraphNode[] = []
  const edges: TaskGraphEdge[] = []

  // 添加用户请求节点（入口）
  nodes.push({
    id: `user-request-${flow.taskId}`,
    type: 'user_request',
    title: '用户请求',
    status: 'completed',
    timestamp: flow.nodes[0]?.createdAt ?? new Date().toISOString(),
  })

  // 添加任务节点
  nodes.push({
    id: flow.taskId,
    type: 'task',
    title: flow.title,
    status: flow.status,
    timestamp: flow.nodes[0]?.createdAt ?? new Date().toISOString(),
    metadata: { lifecyclePhase: flow.lifecycle.phase },
  })

  // 添加边：用户请求 -> 任务
  edges.push({
    from: `user-request-${flow.taskId}`,
    to: flow.taskId,
    type: 'triggers',
  })

  // 添加其他节点
  for (const node of flow.nodes) {
    if (node.id === flow.taskId) continue // 跳过任务节点（已添加）

    nodes.push({
      id: node.id,
      type: node.type as TaskGraphNode['type'],
      title: node.title,
      status: node.status,
      timestamp: node.createdAt ?? new Date().toISOString(),
      metadata: node.meta as Record<string, string | number> | undefined,
    })

    // 添加边：任务 -> 节点
    edges.push({
      from: flow.taskId,
      to: node.id,
      type: 'produces',
    })
  }

  // 添加执行回执节点（出口）
  const receiptNode = flow.nodes.find((n) => n.type === 'runtime_receipt')
  if (receiptNode) {
    edges.push({
      from: receiptNode.id,
      to: `receipt-${flow.taskId}`,
      type: 'completes',
    })
  }

  nodes.push({
    id: `receipt-${flow.taskId}`,
    type: 'receipt',
    title: '执行回执',
    status: flow.status === 'completed' ? 'completed' : 'pending',
    timestamp: new Date().toISOString(),
  })

  const blockedNodes = nodes.filter((n) => n.status === 'blocked' || n.status === 'failed').length
  const completedNodes = nodes.filter((n) => n.status === 'completed' || n.status === 'succeeded').length

  return {
    taskId: flow.taskId,
    taskTitle: flow.title,
    nodes,
    edges,
    summary: {
      totalNodes: nodes.length,
      blockedNodes,
      completedNodes,
      lifecyclePhase: flow.lifecycle.phase,
    },
  }
}
