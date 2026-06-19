import {
  createExecutionIntent,
  createExecutionPlan,
  type ExecutionEvidenceRef,
} from '@/lib/execution-gateway'
import type { BlockedToolRequest } from '@/lib/agents/task-executor'

export interface CreateToolRequestIntentInput {
  correlationId: string
  agentTaskRunRecordId: string
  agentId: string
  taskId: string
  blockedToolRequests: BlockedToolRequest[]
  proposedActionSummary?: string
}

export interface ToolRequestIntentResult {
  executionIntentRecordId: string
  executionPlanRecordId: string
}

export async function createToolRequestIntentAndPlan(
  input: CreateToolRequestIntentInput
): Promise<ToolRequestIntentResult> {
  const sanitizedEvidenceRefs: ExecutionEvidenceRef[] = [
    {
      sourceType: 'agent_run',
      sourceId: input.agentTaskRunRecordId,
      summary: `Agent task run ${input.agentTaskRunRecordId} requested an approval-gated local action proposal.`,
      redactionStatus: 'sanitized',
      reviewUseOnly: true,
      localReferenceOnly: true,
      isExecutionToken: false,
      isRoutingToken: false,
      isPermissionGrant: false,
      isReleaseToken: false,
      isDeployToken: false,
      isTaskCompletionToken: false,
      grantsRuntimePermission: false,
      mutatesSourceRecords: false,
    },
    {
      sourceType: 'tool_call',
      sourceId: input.taskId,
      summary: summarizeBlockedToolRequests(input.blockedToolRequests),
      redactionStatus: 'sanitized',
      reviewUseOnly: true,
      localReferenceOnly: true,
      isExecutionToken: false,
      isRoutingToken: false,
      isPermissionGrant: false,
      isReleaseToken: false,
      isDeployToken: false,
      isTaskCompletionToken: false,
      grantsRuntimePermission: false,
      mutatesSourceRecords: false,
    },
  ]

  const intent = await createExecutionIntent({
    intentTitle: `Agent local action proposal for ${input.agentId}`,
    intentSummary: buildIntentSummary(input),
    requestedBy: 'system_record',
    sourceTaskId: input.taskId,
    requestedActionType: 'agent_tool_request_proposal',
    requestedActionSummary: input.proposedActionSummary ?? 'Agent requested an approval-gated local action proposal.',
    expectedOutcome: 'Create a draft local governance review chain without any runtime permission or side effect.',
    riskSummary: 'Requires Kelvin approval before any future controlled execution. This record does not grant runtime permission and does not perform tool execution.',
    sanitizedEvidenceRefs,
    createdBy: 'system_record',
    correlationId: input.correlationId,
    idempotencyKey: `agent-tool-intent-${input.agentTaskRunRecordId}`,
  })

  const plan = await createExecutionPlan({
    intentRecordId: intent.record.id,
    planTitle: `Review plan for ${input.agentId} local action proposal`,
    planSummary: 'Review the blocked local action proposal, validate scope, and decide whether to create a future approval-gated execution path.',
    plannedSteps: [
      'Review the blocked action proposal and supporting evidence.',
      'Confirm that the requested scope stays inside approved local boundaries.',
      'Decide whether a future controlled execution plan should be created.',
    ],
    preconditions: [
      'Kelvin review is required.',
      'No runtime execution permission is granted by this record.',
    ],
    postconditions: [
      'A local governance decision is recorded.',
      'Any future execution must still go through policy, approval, and execution-runtime.',
    ],
    humanCheckpoints: [
      'Kelvin reviews the proposed local action.',
      'Operator confirms no direct tool execution occurred.',
    ],
    riskControls: [
      'No direct tool execution.',
      'No file write, command execution, or external API access.',
      'Future execution remains approval-gated.',
    ],
    rollbackNotes: 'No rollback action needed because this draft plan creates governance records only.',
    sanitizedEvidenceRefs,
    createdBy: 'system_record',
    correlationId: input.correlationId,
    idempotencyKey: `agent-tool-plan-${input.agentTaskRunRecordId}`,
  })

  return {
    executionIntentRecordId: intent.record.id,
    executionPlanRecordId: plan.record.id,
  }
}

function buildIntentSummary(input: CreateToolRequestIntentInput): string {
  return [
    `Agent ${input.agentId} requested a local action proposal during ChatHub task ${input.taskId}.`,
    `Agent task run record: ${input.agentTaskRunRecordId}.`,
    'The request was withheld and converted into a draft local governance review chain.',
  ].join(' ')
}

function summarizeBlockedToolRequests(blockedToolRequests: BlockedToolRequest[]): string {
  const names = blockedToolRequests.map((request) => request.toolName).join(', ')
  return `Blocked local action proposal references tool requests: ${names}. Review only; no tool execution was performed.`
}
