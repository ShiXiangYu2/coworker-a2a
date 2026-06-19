import { prisma } from '@/lib/prisma'
import { listAgentRunsForTask } from '@/lib/agent-runtime/repository'
import { getTaskBundle, listTasks } from '@/lib/harmony/repository'
import { listAuditEvents } from '@/lib/observability/repository'
import { getTaskRuntimeExecutionSummary } from '@/lib/runtime-execution/task-summary'
import {
  deriveTaskLifecyclePhase,
  type DerivedTaskLifecycle,
} from '@/lib/workflow/lifecycle'

export type OperatorTaskFlowNodeType =
  | 'task'
  | 'agent_run'
  | 'workflow'
  | 'runtime_job'
  | 'runtime_receipt'
  | 'audit'

export type OperatorRuntimeSection =
  | 'summary'
  | 'latest-receipt'
  | 'blocked-signal'

export interface OperatorTaskFlowNodeNavigation {
  taskFlowHref: string
  runtimeHref?: string
  runtimeSection?: OperatorRuntimeSection
}

export interface OperatorTaskFlowNode {
  id: string
  type: OperatorTaskFlowNodeType
  title: string
  status: string
  summary?: string
  createdAt?: string
  meta?: Record<string, string | number | boolean | null>
  navigation?: OperatorTaskFlowNodeNavigation
}

export interface OperatorTaskFlowReadModel {
  taskId: string
  title: string
  status: string
  lifecycle: DerivedTaskLifecycle
  navigation: {
    taskFlowHref: string
    runtimeHref: string
  }
  nodes: OperatorTaskFlowNode[]
}

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 20

export async function listOperatorTaskFlows(input: {
  limit?: number
} = {}): Promise<OperatorTaskFlowReadModel[]> {
  const limit = clampLimit(input.limit)
  const taskBundles = await listTasks({})

  const flows = await Promise.all(
    taskBundles.slice(0, limit).flatMap((bundle) => {
      if (!bundle.task) return []
      return buildOperatorTaskFlow(bundle.task.id)
    })
  )

  return flows
}

async function buildOperatorTaskFlow(taskId: string): Promise<OperatorTaskFlowReadModel> {
  const [taskBundle, agentRuns, runtimeSummary, workflowProposals, auditEvents] =
    await Promise.all([
      getTaskBundle(taskId),
      listAgentRunsForTask(taskId),
      getTaskRuntimeExecutionSummary(taskId),
      listTaskWorkflowProposalNodes(taskId),
      listAuditEvents({ taskId, limit: 3 }),
    ])

  const task = taskBundle?.task
  const nodes: OperatorTaskFlowNode[] = []

  if (task) {
    nodes.push({
      id: task.id,
      type: 'task',
      title: task.title,
      status: task.status,
      summary: task.description || task.reason,
      createdAt: task.createdAt,
      meta: {
        type: task.type,
        targetAgentId: task.targetAgentId ?? null,
        confidence: task.confidence,
      },
    })
  }

  for (const runBundle of agentRuns) {
    const run = runBundle.agentRun
    nodes.push({
      id: run.id,
      type: 'agent_run',
      title: `Agent ${run.agentId}`,
      status: run.status,
      summary: run.result?.summary ?? run.error?.message ?? 'Analysis-only AgentRun record.',
      createdAt: run.createdAt,
      meta: {
        runtimeMode: run.runtimeMode,
        trigger: run.trigger,
        correlationId: run.correlationId ?? null,
      },
    })
  }

  for (const proposal of workflowProposals) {
    nodes.push(proposal)
  }

  for (const timeline of runtimeSummary.jobs) {
    const job = timeline.job
    if (!job) continue
    nodes.push({
      id: job.id,
      type: 'runtime_job',
      title: `${job.connectorId} / ${job.actionType}`,
      status: job.status,
      summary: 'Runtime dispatch job read-only status.',
      createdAt: toIsoString(job.createdAt),
      meta: {
        priority: job.priority,
        attemptCount: job.attemptCount,
        receiptStatus: timeline.derived.receiptStatus,
      },
    })

    const receipt = timeline.receipt
    if (receipt) {
      nodes.push({
        id: receipt.id,
        type: 'runtime_receipt',
        title: receipt.targetRef,
        status: receipt.status,
        summary: receipt.summary,
        createdAt: toIsoString(receipt.completedAt ?? receipt.createdAt),
        meta: {
          connectorId: receipt.connectorId,
          actionType: receipt.actionType,
          jobId: receipt.jobId,
        },
      })
    }
  }

  for (const event of auditEvents) {
    nodes.push({
      id: event.id,
      type: 'audit',
      title: event.eventType,
      status: event.afterStatus ?? event.beforeStatus ?? event.actorType,
      summary: event.reason,
      createdAt: event.createdAt,
      meta: {
        actorType: event.actorType,
        actorId: event.actorId ?? null,
      },
    })
  }

  const latestRuntimeStatus = runtimeSummary.jobs.find((timeline) => timeline.job)?.job?.status
  const lifecycle = deriveTaskLifecyclePhase({
    taskStatus: task?.status ?? runtimeSummary.taskStatus,
    hasWorkflowProposal: workflowProposals.length > 0,
    hasRuntimeJob: runtimeSummary.jobs.length > 0,
    latestRuntimeStatus,
    hasEvalOrReview: runtimeSummary.hasEvalOrReview,
    hasBlockedOrFailedExecution:
      runtimeSummary.counts.blocked > 0 || runtimeSummary.counts.failed > 0,
  })

  return {
    taskId,
    title: task?.title ?? taskId,
    status: task?.status ?? runtimeSummary.taskStatus ?? 'unknown',
    lifecycle,
    navigation: {
      taskFlowHref: `/operator?taskFlowTaskId=${encodeURIComponent(taskId)}#task-flow`,
      runtimeHref: `/operator?runtimeTaskId=${encodeURIComponent(taskId)}#runtime`,
    },
    nodes: sortNodes(nodes).map((node) => withNodeNavigation(taskId, node)),
  }
}

async function listTaskWorkflowProposalNodes(
  taskId: string
): Promise<OperatorTaskFlowNode[]> {
  const proposals = await prisma.workflowProposal.findMany({
    where: { sourceKind: 'task', sourceRecordId: taskId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  return proposals.map((proposal) => ({
    id: proposal.id,
    type: 'workflow' as const,
    title: proposal.title,
    status: proposal.status,
    summary: proposal.summary,
    createdAt: toIsoString(proposal.createdAt),
    meta: {
      workflowIntent: proposal.workflowIntent,
      riskLevel: proposal.riskLevel,
      correlationId: proposal.correlationId,
    },
  }))
}

function sortNodes(nodes: OperatorTaskFlowNode[]): OperatorTaskFlowNode[] {
  return [...nodes].sort((a, b) => timeValue(a.createdAt) - timeValue(b.createdAt))
}

function timeValue(value: string | undefined): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function toIsoString(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined
  return value instanceof Date ? value.toISOString() : value
}

function withNodeNavigation(
  taskId: string,
  node: OperatorTaskFlowNode
): OperatorTaskFlowNode {
  const runtimeSection = runtimeSectionForNode(node)
  return {
    ...node,
    navigation: {
      taskFlowHref: buildTaskFlowNodeHref(taskId, node.id),
      ...(runtimeSection
        ? {
            runtimeHref: buildRuntimeHref(taskId, runtimeSection),
            runtimeSection,
          }
        : {}),
    },
  }
}

function runtimeSectionForNode(
  node: OperatorTaskFlowNode
): OperatorRuntimeSection | undefined {
  if (node.type === 'runtime_receipt') return 'latest-receipt'
  if (node.type !== 'runtime_job') return undefined

  const status = node.status.toLowerCase()
  if (status === 'blocked' || status === 'failed') return 'blocked-signal'
  return 'summary'
}

function buildTaskFlowNodeHref(taskId: string, nodeId: string): string {
  return `/operator?taskFlowTaskId=${encodeURIComponent(taskId)}&taskFlowNodeId=${encodeURIComponent(nodeId)}#task-flow`
}

function buildRuntimeHref(taskId: string, section: OperatorRuntimeSection): string {
  return `/operator?runtimeTaskId=${encodeURIComponent(taskId)}&runtimeSection=${encodeURIComponent(section)}#runtime`
}

function clampLimit(value: number | undefined): number {
  if (!value || Number.isNaN(value)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(value)))
}
