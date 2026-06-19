import { randomUUID } from 'node:crypto'
import { basename } from 'node:path'
import { prisma } from '@/lib/prisma'
import { encodeJson } from '@/lib/harmony/serializers'
import {
  createExecutionApproval,
  createExecutionGate,
  createExecutionIntent,
  createExecutionPlan,
  getExecutionIntentTimeline,
  transitionExecutionGatewayRecord,
  type ExecutionEvidenceRef,
} from '@/lib/execution-gateway'
import { createObsidianDraftPlan, type ObsidianDraftPlan } from '@/lib/tools/obsidian-draft'
import type { PolicyCheckResult } from '@/lib/policy-engine'
import { obsidianWriteDraftTool, type ToolExecutionReceipt } from '@/lib/tool-registry'
import { runExecutionRuntime } from '@/lib/execution-runtime'
import { runElonOrchestrator } from '@/lib/orchestrator'
import { runRecordedAgentTask, type DemoEvidence } from '@/lib/agent-task-runner'

export interface CompetitorWeeklyDemoInput {
  conversationId?: string
  userMessage: string
  evidenceIds?: string[]
  approved?: boolean
}

interface DemoTaskBundle {
  chatHubRequest: {
    conversationId?: string
    userMessage: string
  }
  orchestrator: 'elon'
  tasks: Array<{
    agent: 'research.agent' | 'content.agent'
    title: string
    status: 'completed'
    agentTaskRunRecordId: string
    outputSummary: string
  }>
  researchSummary: string[]
  markdownDraft: string
}

export interface CompetitorWeeklyDemoResult {
  correlationId: string
  taskBundle: DemoTaskBundle
  executionPlan: ObsidianDraftPlan
  executionGateway: {
    intentId: string
    planId: string
    gateId: string
    approvalRecordId?: string
  }
  toolExecution: {
    toolId: string
    policyDecision: PolicyCheckResult['decision']
    policyAllowed: boolean
  }
  receipt: ToolExecutionReceipt
  runtimeRecordId: string
  agentTaskRunRecordIds: string[]
  markdownPath?: string
  timeline: Array<{
    id: string
    eventType: string
    actorType: string
    reason: string
    createdAt: string
    payload?: unknown
  }>
}

export async function runCompetitorWeeklyDemo(input: CompetitorWeeklyDemoInput): Promise<CompetitorWeeklyDemoResult> {
  const correlationId = `demo-competitor-weekly-${randomUUID()}`
  const orchestration = runElonOrchestrator({
    conversationId: input.conversationId,
    userMessage: input.userMessage,
    scenario: 'competitor_weekly',
  })
  const researchTask = orchestration.tasks.find((task) => task.agentId === 'research.agent')
  const contentTask = orchestration.tasks.find((task) => task.agentId === 'content.agent')

  if (!researchTask || !contentTask) {
    throw new Error('Competitor weekly orchestration must include research and content tasks.')
  }

  const filename = buildDraftFilename()
  const draftTitle = 'Competitor weekly draft'
  const executionMode = input.approved ? 'approved_vault_draft' : 'plan_only'

  await createAuditEvent({
    correlationId,
    eventType: 'demo_scenario.request_received',
    actorType: 'chat_hub',
    reason: 'ChatHub received the competitor weekly draft request.',
    payload: {
      conversationId: input.conversationId,
      userMessage: input.userMessage,
      evidenceIds: input.evidenceIds ?? [],
    },
  })

  await createAuditEvent({
    correlationId,
    eventType: 'demo_scenario.orchestrator.task_planned',
    actorType: 'elon',
    reason: 'Elon planned the competitor weekly request as agent tasks.',
    payload: {
      orchestrator: orchestration.orchestrator,
      tasks: orchestration.tasks,
    },
  })

  await createAuditEvent({
    correlationId,
    eventType: 'demo_scenario.agent_task.started',
    actorType: researchTask.agentId,
    reason: 'Research Agent started local evidence summarization.',
    payload: { taskId: researchTask.id, taskType: researchTask.type },
  })

  const researchResult = await runRecordedAgentTask({
    task: researchTask,
    orchestrator: orchestration.orchestrator,
    correlationId,
    context: {
      userMessage: input.userMessage,
      evidenceIds: input.evidenceIds,
    },
  })

  if (researchResult.kind !== 'research_summary') {
    throw new Error('Research Agent did not return a research summary.')
  }

  const evidence = researchResult.evidence
  const researchSummary = researchResult.researchSummary

  await createAuditEvent({
    correlationId,
    eventType: 'demo_scenario.agent_task.completed',
    actorType: researchTask.agentId,
    reason: 'Research Agent summarized local mock evidence and web snapshots.',
    payload: {
      taskId: researchTask.id,
      agentTaskRunRecordId: researchResult.agentTaskRunRecordId,
      outputSummary: researchResult.outputSummary,
      evidenceIds: evidence.map((item) => item.id),
    },
  })

  await createAuditEvent({
    correlationId,
    eventType: 'demo_scenario.agent_task.started',
    actorType: contentTask.agentId,
    reason: 'Content Agent started Markdown compilation.',
    payload: {
      taskId: contentTask.id,
      taskType: contentTask.type,
      dependsOn: contentTask.dependsOn ?? [],
    },
  })

  const contentResult = await runRecordedAgentTask({
    task: contentTask,
    orchestrator: orchestration.orchestrator,
    correlationId,
    context: {
      userMessage: input.userMessage,
      researchSummary,
    },
  })

  if (contentResult.kind !== 'markdown_draft') {
    throw new Error('Content Agent did not return a Markdown draft.')
  }

  const markdownDraft = contentResult.markdownDraft

  await createAuditEvent({
    correlationId,
    eventType: 'demo_scenario.agent_task.completed',
    actorType: contentTask.agentId,
    reason: 'Content Agent produced the weekly Markdown draft.',
    payload: {
      taskId: contentTask.id,
      agentTaskRunRecordId: contentResult.agentTaskRunRecordId,
      outputSummary: contentResult.outputSummary,
      draftTitle,
      filename,
    },
  })

  const evidenceRefs = toExecutionEvidenceRefs(evidence)
  const intent = await createExecutionIntent({
    intentTitle: 'Demo Obsidian vault Markdown draft intent',
    intentSummary: 'Prepare a reviewed vault draft plan for the competitor weekly report demo.',
    requestedBy: 'user',
    requestedActionType: 'demo_local_markdown_draft_review',
    requestedActionSummary: 'Review a proposal to create one Markdown draft under the configured Obsidian vault Inbox/AI Drafts directory after Kelvin approval.',
    expectedOutcome: 'A reviewed execution record chain plus an optional Kelvin-approved Markdown draft in the configured Obsidian vault.',
    riskSummary: 'Medium-risk local vault draft creation inside Inbox/AI Drafts only, with explicit approval and audit trail.',
    sanitizedEvidenceRefs: evidenceRefs,
    createdBy: 'operator',
    correlationId,
    sourceTaskId: input.conversationId,
  })

  const plan = await createExecutionPlan({
    intentRecordId: intent.record.id,
    planTitle: 'Demo Obsidian draft plan',
    planSummary: 'Prepare the Markdown draft content and proposed Obsidian vault target path before any vault draft is created.',
    plannedSteps: [
      'Plan the request as research and content agent tasks.',
      'Summarize competitor signals into weekly highlights.',
      'Compile the weekly Markdown draft.',
      'Review the Obsidian vault draft target path.',
      'Require Kelvin approval before creating the Obsidian vault Markdown draft.',
    ],
    preconditions: [
      'Local mock evidence is available.',
      'Target path remains inside the configured Obsidian vault Inbox/AI Drafts directory.',
      'Kelvin approval must exist before an Obsidian vault draft is produced.',
    ],
    postconditions: [
      'An Obsidian vault Markdown draft exists only after Kelvin approval.',
      'Audit events describe the full demo timeline.',
    ],
    humanCheckpoints: ['Kelvin reviews the Obsidian vault draft plan and approval gate.'],
    riskControls: [
      'No external network access.',
      'No writes outside the configured vault Inbox/AI Drafts directory.',
      'Dry run path available when approval is absent.',
    ],
    rollbackNotes: 'This demo creates an Obsidian vault draft only after Kelvin approval; without approval, the flow remains plan-only.',
    sanitizedEvidenceRefs: evidenceRefs,
    createdBy: 'operator',
    correlationId,
  })

  const gate = await createExecutionGate({
    intentRecordId: intent.record.id,
    planRecordId: plan.record.id,
    gateName: 'Kelvin vault draft approval',
    gateSummary: 'Kelvin must approve the Obsidian vault draft plan before the demo can create the draft file.',
    gateDecision: input.approved ? 'approved_record' : 'pending_review',
    requiredReviewer: 'kelvin',
    requiredEvidenceRefs: evidenceRefs,
    blockedReasons: input.approved ? [] : ['Kelvin approval has not been recorded yet.'],
    createdBy: 'operator',
    correlationId,
  })

  await transitionExecutionGatewayRecord({
    recordType: 'execution_intent_record',
    id: intent.record.id,
    targetStatus: 'review',
    reason: 'Submitted demo execution intent for Kelvin review.',
  })

  await transitionExecutionGatewayRecord({
    recordType: 'execution_plan_record',
    id: plan.record.id,
    targetStatus: 'review',
    reason: 'Submitted demo execution plan for Kelvin review.',
  })

  await transitionExecutionGatewayRecord({
    recordType: 'execution_gate_record',
    id: gate.record.id,
    targetStatus: 'review',
    reason: 'Submitted demo approval gate for Kelvin review.',
  })

  const draftPlan = createObsidianDraftPlan({
    draftTitle,
    filename,
    content: markdownDraft,
    riskLevel: input.approved ? 'medium' : 'low',
    dryRun: !input.approved,
  })
  const toolId = obsidianWriteDraftTool.id

  await createAuditEvent({
    correlationId,
    eventType: 'demo_scenario.execution_plan_created',
    actorType: 'execution_gateway',
    reason: 'Execution Gateway recorded the Obsidian vault draft plan and approval gate.',
    payload: {
      executionIntentId: intent.record.id,
      executionPlanId: plan.record.id,
      executionGateId: gate.record.id,
      toolId,
      draftPlanId: draftPlan.id,
      action: draftPlan.action,
      targetPath: draftPlan.targetPath,
      dryRun: draftPlan.dryRun,
      mode: executionMode,
    },
  })

  let approvalRecordId: string | undefined

  if (input.approved) {
    await transitionExecutionGatewayRecord({
      recordType: 'execution_intent_record',
      id: intent.record.id,
      targetStatus: 'approved_record',
      reason: 'Kelvin approved the demo execution intent.',
      reviewedBy: 'kelvin',
    })
    await transitionExecutionGatewayRecord({
      recordType: 'execution_plan_record',
      id: plan.record.id,
      targetStatus: 'approved_record',
      reason: 'Kelvin approved the demo execution plan.',
      reviewedBy: 'kelvin',
    })
    await transitionExecutionGatewayRecord({
      recordType: 'execution_gate_record',
      id: gate.record.id,
      targetStatus: 'approved_record',
      reason: 'Kelvin approved the Obsidian vault draft gate.',
      reviewedBy: 'kelvin',
    })

    const approval = await createExecutionApproval({
      targetType: 'execution_gate_record',
      targetId: gate.record.id,
      reviewer: 'kelvin',
      verdict: 'approved_record',
      reviewNotes: 'Kelvin approved this demo Obsidian vault Markdown draft plan for a single run.',
      evidenceRefs,
      createdBy: 'kelvin',
      correlationId,
    })
    approvalRecordId = approval.record.id

    await createAuditEvent({
      correlationId,
      eventType: 'demo_scenario.approval_recorded',
      actorType: 'kelvin',
      reason: 'Kelvin approved the Obsidian vault Markdown draft plan.',
      payload: { approvalRecordId, executionGateId: gate.record.id },
    })
  } else {
    await createAuditEvent({
      correlationId,
      eventType: 'demo_scenario.awaiting_approval',
      actorType: 'kelvin',
      reason: 'The demo remains plan-only until Kelvin approval is recorded.',
      payload: { executionGateId: gate.record.id },
    })
  }

  const runtimeResult = await runExecutionRuntime({
    plan: draftPlan,
    toolId,
    riskLevel: obsidianWriteDraftTool.riskLevel,
    approval: {
      approved: Boolean(input.approved),
      approvalRecordId,
      approvedBy: approvalRecordId ? 'kelvin' : undefined,
    },
    policyInput: {
      action: draftPlan.action,
      targetPath: draftPlan.targetPath,
      allowedDirectory: draftPlan.targetDirectory,
      dryRun: draftPlan.dryRun,
      allowOverwrite: false,
    },
    auditWriter: async (event) => {
      await createAuditEvent({
        correlationId,
        eventType: `demo_scenario.${event.eventType}`,
        actorType: event.actorType,
        reason: event.reason,
        payload: event.payload,
      })
    },
    auditContext: {
      correlationId,
    },
  })

  const approvedPolicyResult = runtimeResult.policyResult
  const receipt = runtimeResult.receipt

  await createAuditEvent({
    correlationId,
    eventType: receipt.status === 'succeeded' ? 'demo_scenario.vault_draft_created' : 'demo_scenario.local_draft_withheld',
    actorType: 'tool',
    reason: receipt.reason,
    payload: {
      receiptId: receipt.id,
      toolId: receipt.toolId,
      action: receipt.action,
      path: receipt.path,
      status: receipt.status,
      approvalRecordId,
      policyDecision: approvedPolicyResult.decision,
    },
  })

  const timelineRecords = await getExecutionIntentTimeline(intent.record.id)
  const extraEvents = await prisma.harmonyAuditEvent.findMany({
    where: {
      correlationId,
      eventType: { startsWith: 'demo_scenario.' },
    },
    orderBy: { createdAt: 'asc' },
  })

  const timeline = dedupeTimeline([...timelineRecords, ...extraEvents]).map((event) => ({
    id: event.id,
    eventType: event.eventType,
    actorType: event.actorType,
    reason: event.reason,
    createdAt: event.createdAt.toISOString(),
    payload: safeParseJson(event.payloadJson),
  }))

  return {
    correlationId,
    taskBundle: {
      chatHubRequest: {
        conversationId: input.conversationId,
        userMessage: input.userMessage,
      },
      orchestrator: orchestration.orchestrator,
      tasks: [
        {
          agent: researchTask.agentId,
          title: researchTask.title,
          status: 'completed',
          agentTaskRunRecordId: researchResult.agentTaskRunRecordId,
          outputSummary: researchResult.outputSummary,
        },
        {
          agent: contentTask.agentId,
          title: contentTask.title,
          status: 'completed',
          agentTaskRunRecordId: contentResult.agentTaskRunRecordId,
          outputSummary: `${contentResult.outputSummary} Target: ${basename(draftPlan.targetPath)}.`,
        },
      ],
      researchSummary,
      markdownDraft,
    },
    executionPlan: draftPlan,
    executionGateway: {
      intentId: intent.record.id,
      planId: plan.record.id,
      gateId: gate.record.id,
      approvalRecordId,
    },
    toolExecution: {
      toolId,
      policyDecision: approvedPolicyResult.decision,
      policyAllowed: approvedPolicyResult.allowed,
    },
    receipt,
    runtimeRecordId: runtimeResult.runtimeRecordId,
    agentTaskRunRecordIds: [
      researchResult.agentTaskRunRecordId,
      contentResult.agentTaskRunRecordId,
    ],
    markdownPath: receipt.status === 'succeeded' ? receipt.path : undefined,
    timeline,
  }
}

function buildDraftFilename(): string {
  const date = new Date().toISOString().slice(0, 10)
  return `competitor-weekly-${date}.md`
}

function toExecutionEvidenceRefs(evidence: DemoEvidence[]): ExecutionEvidenceRef[] {
  return evidence.map((item) => ({
    sourceType: item.sourceType === 'web_snapshot' ? 'sanitized_evidence_snapshot' : 'manual_note',
    sourceId: item.id,
    summary: `${item.title}: ${item.notes[0]}`,
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
  }))
}

async function createAuditEvent(args: {
  correlationId: string
  eventType: string
  actorType: string
  reason: string
  payload?: unknown
}) {
  return prisma.harmonyAuditEvent.create({
    data: {
      correlationId: args.correlationId,
      eventType: args.eventType,
      actorType: args.actorType,
      reason: args.reason,
      payloadJson: args.payload === undefined ? null : encodeJson(args.payload),
    },
  })
}

function dedupeTimeline(
  events: Array<{
    id: string
    eventType: string
    actorType: string
    reason: string
    createdAt: Date
    payloadJson: string | null
  }>
) {
  const map = new Map<string, (typeof events)[number]>()
  for (const event of events) {
    map.set(event.id, event)
  }
  return [...map.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}

function safeParseJson(value: string | null) {
  if (!value) return undefined
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}
