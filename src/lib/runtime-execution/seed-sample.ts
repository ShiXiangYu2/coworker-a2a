import { randomUUID } from 'node:crypto'
import {
  createRuntimeDispatchJob,
  createRuntimeExecutionToken,
  RuntimeExecutionApiError,
  transitionRuntimeExecutionToken,
} from './repository'
import type {
  RuntimeExecutionScope,
  StructuredRuntimeExecutionPlan,
} from './types'
import { SPRINT_22_SAFETY_NOTE } from './types'

export interface SeedRuntimeSampleJobInput {
  taskId: string
  createdBy?: string
  workerHint?: string
  vaultPath?: string
  now?: Date
}

export interface SeedRuntimeSampleJobResult {
  ok: true
  tokenId: string
  jobId: string
  taskId: string
  correlationId: string
  idempotencyKey: string
  connectorId: 'obsidian_local'
  actionType: 'write_local_markdown_draft'
  nextCommands: {
    verifyDryRun: string
    runDryRun: string
    runObsidianWrite: string
  }
  safetyNote: string
}

export async function seedRuntimeSampleJob(input: SeedRuntimeSampleJobInput): Promise<SeedRuntimeSampleJobResult> {
  const taskId = input.taskId.trim()
  if (!taskId) throw new RuntimeExecutionApiError('taskId is required.')

  const now = input.now ?? new Date()
  const createdBy = input.createdBy?.trim() || 'runtime-seed-sample-job'
  const workerHint = input.workerHint?.trim() || 'worker-dev-1'
  const correlationId = `runtime-seed-${randomUUID()}`
  const agentRunId = `seed-agent-run-${randomUUID()}`
  const executionPlanRecordId = `seed-execution-plan-${randomUUID()}`
  const executionApprovalRecordId = `seed-execution-approval-${randomUUID()}`
  const filename = `runtime-seed-${taskId.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 48) || 'task'}.md`
  const idempotencyKey = `runtime-seed:${taskId}:${filename}:${randomUUID()}`
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
  const vaultPath = input.vaultPath?.trim() || String.raw`D:\AI-Vault`

  const plan: StructuredRuntimeExecutionPlan = {
    id: `seed-plan-${randomUUID()}`,
    taskId,
    agentRunId,
    summary: 'Seed a controlled Obsidian Markdown draft job for Sprint 22 verification.',
    connectorId: 'obsidian_local',
    actionType: 'write_local_markdown_draft',
    riskLevel: 'low',
    requiresHumanApproval: true,
    idempotencyKey,
    timeoutMs: 15000,
    maxAttempts: 2,
    payload: {
      draftTitle: `Sprint 22 Runtime Seed - ${taskId}`,
      filename,
      content: [
        `# Sprint 22 Runtime Seed - ${taskId}`,
        '',
        'This Markdown draft payload was generated as seed data only.',
        '',
        `- Created by: ${createdBy}`,
        `- Connector: obsidian_local.write_local_markdown_draft`,
        `- Target: Inbox/AI Drafts`,
      ].join('\n'),
      targetDirectoryLabel: 'Inbox/AI Drafts',
    },
  }

  const scope: RuntimeExecutionScope = {
    connectorId: 'obsidian_local',
    actionType: 'write_local_markdown_draft',
    allowedVaultRoot: vaultPath,
    allowedTargetDirectoryLabel: 'Inbox/AI Drafts',
    allowedFilename: filename,
    taskId,
    agentRunId,
    executionPlanRecordId,
    idempotencyKey,
    expiresAt,
  }

  const token = await createRuntimeExecutionToken({
    taskId,
    agentRunId,
    executionPlanRecordId,
    executionApprovalRecordId,
    plan,
    scope,
    issuedBy: 'system_dispatcher',
    approvedBy: 'kelvin',
    correlationId,
    expiresAt,
    idempotencyKey,
  })
  const activeToken = await transitionRuntimeExecutionToken({
    id: token.record.id,
    targetStatus: 'active',
    reason: 'Activated Sprint 22 sample runtime token for local verification.',
  })
  const job = await createRuntimeDispatchJob({
    runtimeTokenId: activeToken.record.id,
    taskId,
    plan,
    correlationId,
    idempotencyKey,
  })

  return {
    ok: true,
    tokenId: activeToken.record.id,
    jobId: job.record.id,
    taskId,
    correlationId,
    idempotencyKey,
    connectorId: 'obsidian_local',
    actionType: 'write_local_markdown_draft',
    nextCommands: {
      verifyDryRun: `npx tsx scripts/runtime-verify-once.ts --jobId=${job.record.id} --workerId=${workerHint}`,
      runDryRun: `npx tsx scripts/runtime-run-once.ts --jobId=${job.record.id} --workerId=${workerHint} --mode=dry_run`,
      runObsidianWrite: `npx tsx scripts/runtime-run-once.ts --jobId=${job.record.id} --workerId=${workerHint} --mode=obsidian_write --execute=true --vaultPath=${vaultPath}`,
    },
    safetyNote: SPRINT_22_SAFETY_NOTE,
  }
}
