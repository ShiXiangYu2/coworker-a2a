import {
  listOperatorTaskFlows,
  type OperatorTaskFlowNode,
  type OperatorTaskFlowReadModel,
} from './task-flow-read-model'

export interface OperatorOverviewRuntimeItem {
  id: string
  taskId: string
  taskTitle: string
  title: string
  status: string
  createdAt?: string
  summary?: string
}

export interface OperatorOverviewBlockedItem {
  id: string
  taskId: string
  taskTitle: string
  source: 'task' | 'agent_run' | 'runtime_job' | 'audit' | 'lifecycle'
  title: string
  status: string
  reason?: string
  createdAt?: string
}

export interface OperatorOverviewReceiptItem {
  id: string
  taskId: string
  taskTitle: string
  title: string
  status: string
  summary?: string
  createdAt?: string
}

export interface OperatorOverviewReadModel {
  generatedAt: string
  totals: {
    taskFlows: number
    tasks: number
    agentRuns: number
    runtimeJobs: number
    runtimeReceipts: number
    blockedSignals: number
  }
  activeRuntime: {
    count: number
    items: OperatorOverviewRuntimeItem[]
  }
  blockedSummary: {
    count: number
    items: OperatorOverviewBlockedItem[]
  }
  recentReceipts: {
    count: number
    items: OperatorOverviewReceiptItem[]
  }
  recentFlows: OperatorTaskFlowReadModel[]
  safetyNote: string
}

const LIVE_RUNTIME_STATUSES = new Set(['queued', 'leased', 'running'])
const BLOCKED_STATUSES = new Set(['blocked', 'failed'])

export async function buildOperatorOverviewReadModel(input: {
  limit?: number
} = {}): Promise<OperatorOverviewReadModel> {
  const flows = await listOperatorTaskFlows({ limit: input.limit })
  return buildOperatorOverviewFromFlows(flows)
}

export function buildOperatorOverviewFromFlows(
  flows: OperatorTaskFlowReadModel[]
): OperatorOverviewReadModel {
  const activeRuntime = collectActiveRuntime(flows)
  const blockedSummary = collectBlockedSignals(flows)
  const recentReceipts = collectRecentReceipts(flows)

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      taskFlows: flows.length,
      tasks: countNodes(flows, 'task'),
      agentRuns: countNodes(flows, 'agent_run'),
      runtimeJobs: countNodes(flows, 'runtime_job'),
      runtimeReceipts: countNodes(flows, 'runtime_receipt'),
      blockedSignals: blockedSummary.length,
    },
    activeRuntime: {
      count: activeRuntime.length,
      items: activeRuntime.slice(0, 5),
    },
    blockedSummary: {
      count: blockedSummary.length,
      items: blockedSummary.slice(0, 5),
    },
    recentReceipts: {
      count: recentReceipts.length,
      items: recentReceipts.slice(0, 5),
    },
    recentFlows: flows,
    safetyNote:
      'Operator Overview is a read-only derived view. It summarizes existing task, agent, runtime, receipt, and audit records without changing execution state.',
  }
}

function collectActiveRuntime(flows: OperatorTaskFlowReadModel[]): OperatorOverviewRuntimeItem[] {
  return sortNewest(
    flows.flatMap((flow) =>
      flow.nodes
        .filter((node) => node.type === 'runtime_job' && LIVE_RUNTIME_STATUSES.has(node.status))
        .map((node) => ({
          id: node.id,
          taskId: flow.taskId,
          taskTitle: flow.title,
          title: node.title,
          status: node.status,
          summary: node.summary,
          createdAt: node.createdAt,
        }))
    )
  )
}

function collectBlockedSignals(flows: OperatorTaskFlowReadModel[]): OperatorOverviewBlockedItem[] {
  const items: OperatorOverviewBlockedItem[] = []

  for (const flow of flows) {
    if (flow.lifecycle.phase === 'repair') {
      items.push({
        id: `${flow.taskId}-lifecycle-repair`,
        taskId: flow.taskId,
        taskTitle: flow.title,
        source: 'lifecycle',
        title: 'Lifecycle repair signal',
        status: flow.lifecycle.phase,
        reason: flow.lifecycle.reason,
      })
    }

    for (const node of flow.nodes) {
      const status = node.status.toLowerCase()
      const title = node.title.toLowerCase()
      const summary = node.summary?.toLowerCase() ?? ''
      const blocked =
        BLOCKED_STATUSES.has(status) ||
        ((node.type === 'audit') &&
          (title.includes('blocked') ||
            title.includes('failed') ||
            summary.includes('blocked') ||
            summary.includes('failed')))

      if (!blocked) continue
      items.push({
        id: node.id,
        taskId: flow.taskId,
        taskTitle: flow.title,
        source: blockedSource(node),
        title: node.title,
        status: node.status,
        reason: node.summary,
        createdAt: node.createdAt,
      })
    }
  }

  return sortNewest(items)
}

function collectRecentReceipts(flows: OperatorTaskFlowReadModel[]): OperatorOverviewReceiptItem[] {
  return sortNewest(
    flows.flatMap((flow) =>
      flow.nodes
        .filter((node) => node.type === 'runtime_receipt')
        .map((node) => ({
          id: node.id,
          taskId: flow.taskId,
          taskTitle: flow.title,
          title: node.title,
          status: node.status,
          summary: node.summary,
          createdAt: node.createdAt,
        }))
    )
  )
}

function blockedSource(node: OperatorTaskFlowNode): OperatorOverviewBlockedItem['source'] {
  if (node.type === 'task') return 'task'
  if (node.type === 'agent_run') return 'agent_run'
  if (node.type === 'runtime_job') return 'runtime_job'
  return 'audit'
}

function countNodes(
  flows: OperatorTaskFlowReadModel[],
  type: OperatorTaskFlowNode['type']
): number {
  return flows.reduce(
    (total, flow) => total + flow.nodes.filter((node) => node.type === type).length,
    0
  )
}

function sortNewest<T extends { createdAt?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt))
}

function timeValue(value: string | undefined): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}
