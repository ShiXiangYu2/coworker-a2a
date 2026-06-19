import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { checkExecutionPolicy, type PolicyCheckInput, type PolicyCheckResult } from '@/lib/policy-engine'
import { executeRegisteredTool, type ToolExecutionContext, type ToolExecutionReceipt } from '@/lib/tool-registry'

export interface ExecutionRuntimePlan {
  id: string
  action: string
  targetPath: string
  targetDirectory: string
  dryRun: boolean
}

export interface ExecutionRuntimeAuditEvent {
  eventType: 'policy_checked' | 'tool_execution_withheld' | 'tool_execution_completed'
  actorType: 'policy_engine' | 'tool_registry'
  reason: string
  payload: Record<string, unknown>
}

export type ExecutionRuntimeAuditWriter = (event: ExecutionRuntimeAuditEvent) => Promise<void>

export interface ExecutionRuntimeInput<TPlan extends ExecutionRuntimePlan> {
  plan: TPlan
  toolId: string
  riskLevel: PolicyCheckInput['riskLevel']
  approval: Pick<ToolExecutionContext, 'approved' | 'approvalRecordId' | 'approvedBy'>
  policyInput: Pick<PolicyCheckInput, 'action' | 'targetPath' | 'allowedDirectory' | 'dryRun' | 'allowOverwrite'>
  auditWriter: ExecutionRuntimeAuditWriter
  auditContext?: {
    correlationId?: string
  }
  now?: Date
}

export interface ExecutionRuntimeResult {
  policyResult: PolicyCheckResult
  receipt: ToolExecutionReceipt
  executed: boolean
  runtimeRecordId: string
}

export async function runExecutionRuntime<TPlan extends ExecutionRuntimePlan>(
  input: ExecutionRuntimeInput<TPlan>
): Promise<ExecutionRuntimeResult> {
  const policyResult = checkExecutionPolicy({
    toolId: input.toolId,
    riskLevel: input.riskLevel,
    approved: input.approval.approved,
    approvalRecordId: input.approval.approvalRecordId,
    ...input.policyInput,
  })

  await input.auditWriter({
    eventType: 'policy_checked',
    actorType: 'policy_engine',
    reason: `Policy decision: ${policyResult.decision}.`,
    payload: {
      toolId: input.toolId,
      action: input.plan.action,
      targetPath: input.plan.targetPath,
      decision: policyResult.decision,
      allowed: policyResult.allowed,
      reasons: policyResult.reasons,
    },
  })

  const runtimeRecord = await prisma.runtimeExecutionRecord.create({
    data: {
      correlationId: input.auditContext?.correlationId,
      toolId: input.toolId,
      action: input.plan.action,
      status: 'policy_checked',
      policyDecision: policyResult.decision,
      targetPath: input.plan.targetPath,
      approvalRecordId: input.approval.approvalRecordId,
      executionPlanId: input.plan.id,
      receiptJson: '{}',
    },
  })

  if (policyResult.decision !== 'allow_controlled_execution') {
    const receipt = buildWithheldReceipt({
      toolId: input.toolId,
      plan: input.plan,
      policyResult,
      now: input.now,
    })

    await input.auditWriter({
      eventType: 'tool_execution_withheld',
      actorType: 'tool_registry',
      reason: receipt.reason,
      payload: {
        receiptId: receipt.id,
        toolId: receipt.toolId,
        action: receipt.action,
        path: receipt.path,
        status: receipt.status,
        policyDecision: policyResult.decision,
      },
    })

    await updateRuntimeRecord(runtimeRecord.id, receipt, policyResult)

    return { policyResult, receipt, executed: false, runtimeRecordId: runtimeRecord.id }
  }

  const receipt = await executeRegisteredTool({
    toolId: input.toolId,
    plan: input.plan,
    context: {
      approved: true,
      approvalRecordId: input.approval.approvalRecordId,
      approvedBy: input.approval.approvedBy,
      now: input.now,
    },
  })

  await input.auditWriter({
    eventType: 'tool_execution_completed',
    actorType: 'tool_registry',
    reason: receipt.reason,
    payload: {
      receiptId: receipt.id,
      toolId: receipt.toolId,
      action: receipt.action,
      path: receipt.path,
      status: receipt.status,
      approvalRecordId: receipt.approvalRecordId,
      policyDecision: policyResult.decision,
    },
  })

  await updateRuntimeRecord(runtimeRecord.id, receipt, policyResult)

  return { policyResult, receipt, executed: true, runtimeRecordId: runtimeRecord.id }
}

function buildWithheldReceipt(args: {
  toolId: string
  plan: ExecutionRuntimePlan
  policyResult: PolicyCheckResult
  now?: Date
}): ToolExecutionReceipt {
  return {
    id: `tool-receipt-withheld-${randomUUID()}`,
    toolId: args.toolId,
    action: args.plan.action,
    status: args.policyResult.decision === 'allow_dry_run' ? 'dry_run' : 'denied',
    path: args.plan.targetPath,
    timestamp: (args.now ?? new Date()).toISOString(),
    executionPlanId: args.plan.id,
    reason: args.policyResult.reasons.join(' '),
  }
}

async function updateRuntimeRecord(
  id: string,
  receipt: ToolExecutionReceipt,
  policyResult: PolicyCheckResult
) {
  return prisma.runtimeExecutionRecord.update({
    where: { id },
    data: {
      status: receipt.status,
      policyDecision: policyResult.decision,
      approvalRecordId: receipt.approvalRecordId,
      receiptJson: JSON.stringify(receipt),
    },
  })
}
