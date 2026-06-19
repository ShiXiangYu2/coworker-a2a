import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  blockRuntimeDispatchJob,
  claimRuntimeDispatchJob,
  completeRuntimeDispatchJobDryRun,
  completeRuntimeDispatchJobObsidianWrite,
  createRuntimeDispatchJob,
  createRuntimeExecutionToken,
  failRuntimeDispatchJob,
  getRuntimeDispatchJobById,
  getRuntimeExecutionTokenById,
  heartbeatRuntimeDispatchJob,
  listRuntimeDispatchJobs,
  listRuntimeExecutionTokens,
  runRuntimeDispatchJobOnce,
  startRuntimeDispatchJob,
} from '@/lib/runtime-execution'
import { POST as createToken, GET as listTokens } from '../tokens/route'
import { GET as getToken } from '../tokens/[id]/route'
import { POST as createJob, GET as listJobs } from '../jobs/route'
import { GET as getJob } from '../jobs/[id]/route'
import { POST as claimJob } from '../jobs/claim/route'
import { POST as heartbeatJob } from '../jobs/[id]/heartbeat/route'
import { POST as startJob } from '../jobs/[id]/start/route'
import { POST as failJob } from '../jobs/[id]/fail/route'
import { POST as blockJob } from '../jobs/[id]/block/route'
import { POST as completeDryRunJob } from '../jobs/[id]/complete-dry-run/route'
import { POST as completeObsidianWriteJob } from '../jobs/[id]/complete-obsidian-write/route'
import { POST as runOnceJob } from '../jobs/[id]/run-once/route'
import { GET as getTaskRuntimeJobs } from '../../tasks/[id]/runtime-jobs/route'

vi.mock('@/lib/runtime-execution', async () => {
  const safetyNote = 'Sprint 22 runtime execution is limited to queued records only.'
  const RuntimeExecutionApiError = class RuntimeExecutionApiError extends Error {
    constructor(message: string, public readonly status = 400) {
      super(message)
    }
  }
  return {
    RuntimeExecutionApiError,
    SPRINT_22_SAFETY_NOTE: safetyNote,
    createRuntimeExecutionToken: vi.fn(async (input) => ({
      record: {
        id: 'token-1',
        status: 'draft',
        connectorId: input.plan.connectorId,
        actionType: input.plan.actionType,
        taskId: input.taskId,
      },
      auditEvent: { id: 'audit-token-1' },
      safetyNote,
    })),
    createRuntimeDispatchJob: vi.fn(async (input) => ({
      record: {
        id: 'job-1',
        status: 'queued',
        runtimeTokenId: input.runtimeTokenId,
        connectorId: input.plan.connectorId,
        actionType: input.plan.actionType,
        taskId: input.taskId,
      },
      auditEvent: { id: 'audit-job-1' },
      safetyNote,
    })),
    listRuntimeExecutionTokens: vi.fn(async () => [{ id: 'token-1', status: 'draft' }]),
    listRuntimeDispatchJobs: vi.fn(async () => [{ id: 'job-1', status: 'queued', taskId: 'task-1' }]),
    getRuntimeExecutionTokenById: vi.fn(async (id) => id === 'missing' ? null : { id, status: 'draft' }),
    getRuntimeDispatchJobById: vi.fn(async (id) => id === 'missing' ? null : { id, status: 'queued' }),
    claimRuntimeDispatchJob: vi.fn(async ({ workerId }) => ({
      record: { id: 'job-1', status: 'leased', leaseOwner: workerId },
      attempt: { id: 'attempt-1', status: 'leased', workerId },
      auditEvent: { id: 'audit-claim-1' },
      safetyNote,
    })),
    heartbeatRuntimeDispatchJob: vi.fn(async ({ id, workerId }) => {
      if (workerId === 'wrong-worker') throw new RuntimeExecutionApiError('leaseOwner mismatch for runtime dispatch job heartbeat.', 409)
      return {
        record: { id, status: 'leased', leaseOwner: workerId },
        auditEvent: { id: 'audit-heartbeat-1' },
        safetyNote,
      }
    }),
    startRuntimeDispatchJob: vi.fn(async ({ id, workerId }) => {
      if (id === 'not-leased') throw new RuntimeExecutionApiError('Runtime dispatch job start requires leased status, got "queued".', 409)
      return {
        record: { id, status: 'running', leaseOwner: workerId },
        attempt: { id: 'attempt-2', status: 'running', workerId },
        auditEvent: { id: 'audit-start-1' },
        safetyNote,
      }
    }),
    failRuntimeDispatchJob: vi.fn(async ({ id, workerId, error }) => ({
      record: { id, status: 'failed', leaseOwner: workerId, lastErrorJson: JSON.stringify(error) },
      attempt: { id: 'attempt-3', status: 'failed', workerId },
      recovery: { id: 'recovery-1', recoveryKind: 'failure_snapshot' },
      auditEvent: { id: 'audit-fail-1' },
      safetyNote,
    })),
    blockRuntimeDispatchJob: vi.fn(async ({ id, workerId, reason }) => ({
      record: { id, status: 'blocked', leaseOwner: workerId, lastErrorJson: JSON.stringify({ reason }) },
      attempt: { id: 'attempt-4', status: 'blocked', workerId },
      recovery: { id: 'recovery-2', recoveryKind: 'failure_snapshot' },
      auditEvent: { id: 'audit-block-1' },
      safetyNote,
    })),
    completeRuntimeDispatchJobDryRun: vi.fn(async ({ id, workerId }) => {
      if (id === 'not-running') throw new RuntimeExecutionApiError('Runtime dispatch job complete-dry-run requires running status, got "leased".', 409)
      if (workerId === 'wrong-worker') throw new RuntimeExecutionApiError('leaseOwner mismatch for runtime dispatch job complete-dry-run.', 409)
      return {
        record: { id, status: 'succeeded', leaseOwner: workerId },
        token: { id: 'token-1', status: 'consumed' },
        receipt: { id: 'receipt-1', status: 'dry_run' },
        recovery: { id: 'recovery-3', recoveryKind: 'post_execute' },
        auditEvent: { id: 'audit-complete-dry-run-1' },
        safetyNote,
      }
    }),
    completeRuntimeDispatchJobObsidianWrite: vi.fn(async ({ id, workerId, execute }) => {
      if (execute !== true) throw new RuntimeExecutionApiError('complete-obsidian-write requires execute=true for real connector execution.', 409)
      if (id === 'wrong-connector') throw new RuntimeExecutionApiError('complete-obsidian-write requires connectorId "obsidian_local".', 409)
      if (workerId === 'wrong-worker') throw new RuntimeExecutionApiError('leaseOwner mismatch for runtime dispatch job complete-obsidian-write.', 409)
      return {
        record: { id, status: 'succeeded', leaseOwner: workerId },
        token: { id: 'token-1', status: 'consumed' },
        receipt: {
          id: 'receipt-obsidian-1',
          status: 'succeeded',
          resultJson: JSON.stringify({ status: 'succeeded', path: 'D:\\AI\\Inbox\\AI Drafts\\weekly-note.md' }),
        },
        connectorReceipt: {
          id: 'obsidian-draft-receipt-1',
          status: 'succeeded',
          action: 'write_local_markdown_draft',
          path: 'D:\\AI\\Inbox\\AI Drafts\\weekly-note.md',
        },
        recovery: { id: 'recovery-4', recoveryKind: 'post_execute' },
        auditEvent: { id: 'audit-complete-obsidian-write-1' },
        safetyNote,
      }
    }),
    runRuntimeDispatchJobOnce: vi.fn(async ({ jobId, workerId, mode, execute }) => {
      if (mode === 'obsidian_write' && execute !== true) throw new RuntimeExecutionApiError('obsidian_write mode requires execute=true.', 409)
      return {
        claim: {
          record: { id: jobId, status: 'leased', leaseOwner: workerId },
          auditEvent: { id: 'audit-run-once-claim-1' },
        },
        start: {
          record: { id: jobId, status: 'running', leaseOwner: workerId },
          auditEvent: { id: 'audit-run-once-start-1' },
        },
        completion: {
          record: { id: jobId, status: 'succeeded', leaseOwner: workerId },
          token: { id: 'token-1', status: 'consumed' },
          receipt: {
            id: mode === 'dry_run' ? 'receipt-run-once-dry-run-1' : 'receipt-run-once-obsidian-1',
            status: mode === 'dry_run' ? 'dry_run' : 'succeeded',
          },
          connectorReceipt: mode === 'obsidian_write'
            ? {
              id: 'obsidian-draft-receipt-1',
              status: 'succeeded',
              action: 'write_local_markdown_draft',
              path: 'D:\\AI\\Inbox\\AI Drafts\\weekly-note.md',
            }
            : undefined,
          recovery: { id: 'recovery-run-once-1', recoveryKind: 'post_execute' },
          auditEvent: { id: 'audit-run-once-complete-1' },
        },
        safetyNote,
      }
    }),
  }
})

const plan = {
  id: 'plan-1',
  taskId: 'task-1',
  agentRunId: 'agent-run-1',
  summary: 'Write approved Obsidian draft only.',
  connectorId: 'obsidian_local',
  actionType: 'write_local_markdown_draft',
  riskLevel: 'low',
  requiresHumanApproval: true,
  idempotencyKey: 'idem-1',
  timeoutMs: 15000,
  maxAttempts: 2,
  payload: {
    draftTitle: 'Weekly note',
    filename: 'weekly-note.md',
    content: '# Weekly note',
    targetDirectoryLabel: 'Inbox/AI Drafts',
  },
}

const scope = {
  connectorId: 'obsidian_local',
  actionType: 'write_local_markdown_draft',
  allowedVaultRoot: String.raw`D:\AI-Vault`,
  allowedTargetDirectoryLabel: 'Inbox/AI Drafts',
  allowedFilename: 'weekly-note.md',
  taskId: 'task-1',
  agentRunId: 'agent-run-1',
  executionPlanRecordId: 'execution-plan-1',
  idempotencyKey: 'idem-1',
  expiresAt: '2026-06-20T00:00:00.000Z',
}

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Sprint 22 Runtime API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates and lists runtime token records without execution', async () => {
    const created = await createToken(jsonRequest('http://localhost/api/runtime/tokens', {
      taskId: 'task-1',
      agentRunId: 'agent-run-1',
      executionPlanRecordId: 'execution-plan-1',
      executionApprovalRecordId: 'execution-approval-1',
      plan,
      scope,
    }))
    const body = await created.json()

    expect(created.status).toBe(201)
    expect(body.data.status).toBe('draft')
    expect(body.safetyNote).toContain('Sprint 22')
    expect(createRuntimeExecutionToken).toHaveBeenCalledTimes(1)

    const listed = await listTokens(new Request('http://localhost/api/runtime/tokens?status=draft'))
    const listedBody = await listed.json()
    expect(listedBody.data[0].id).toBe('token-1')
    expect(listRuntimeExecutionTokens).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }))
  })

  it('creates and lists queued runtime job records without worker execution', async () => {
    const created = await createJob(jsonRequest('http://localhost/api/runtime/jobs', {
      runtimeTokenId: 'token-1',
      taskId: 'task-1',
      plan,
    }))
    const body = await created.json()

    expect(created.status).toBe(201)
    expect(body.data.status).toBe('queued')
    expect(body.safetyNote).toContain('Sprint 22')
    expect(createRuntimeDispatchJob).toHaveBeenCalledTimes(1)

    const listed = await listJobs(new Request('http://localhost/api/runtime/jobs?runtimeTokenId=token-1'))
    const listedBody = await listed.json()
    expect(listedBody.data[0].id).toBe('job-1')
    expect(listRuntimeDispatchJobs).toHaveBeenCalledWith(expect.objectContaining({ runtimeTokenId: 'token-1' }))
  })

  it('queries token/job by id and task-linked jobs', async () => {
    const token = await getToken(new Request('http://localhost/api/runtime/tokens/token-1'), {
      params: Promise.resolve({ id: 'token-1' }),
    })
    const job = await getJob(new Request('http://localhost/api/runtime/jobs/job-1'), {
      params: Promise.resolve({ id: 'job-1' }),
    })
    const taskJobs = await getTaskRuntimeJobs(new Request('http://localhost/api/tasks/task-1/runtime-jobs'), {
      params: Promise.resolve({ id: 'task-1' }),
    })

    expect((await token.json()).data.id).toBe('token-1')
    expect((await job.json()).data.id).toBe('job-1')
    expect((await taskJobs.json()).data.jobs[0].taskId).toBe('task-1')
    expect(getRuntimeExecutionTokenById).toHaveBeenCalledWith('token-1')
    expect(getRuntimeDispatchJobById).toHaveBeenCalledWith('job-1')
    expect(listRuntimeDispatchJobs).toHaveBeenCalledWith({ taskId: 'task-1', limit: 100 })
  })

  it('returns not_found for missing token or job', async () => {
    const token = await getToken(new Request('http://localhost/api/runtime/tokens/missing'), {
      params: Promise.resolve({ id: 'missing' }),
    })
    const job = await getJob(new Request('http://localhost/api/runtime/jobs/missing'), {
      params: Promise.resolve({ id: 'missing' }),
    })

    expect(token.status).toBe(404)
    expect(job.status).toBe(404)
  })

  it('claim only leases queued jobs and records an attempt without execution', async () => {
    const response = await claimJob(jsonRequest('http://localhost/api/runtime/jobs/claim', {
      workerId: 'worker-1',
      leaseDurationMs: 60000,
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.status).toBe('leased')
    expect(body.attempt.status).toBe('leased')
    expect(body.safetyNote).toContain('queued')
    expect(claimRuntimeDispatchJob).toHaveBeenCalledWith(expect.objectContaining({ workerId: 'worker-1' }))
  })

  it('heartbeat requires matching leaseOwner', async () => {
    const ok = await heartbeatJob(jsonRequest('http://localhost/api/runtime/jobs/job-1/heartbeat', {
      workerId: 'worker-1',
      leaseDurationMs: 60000,
    }), { params: Promise.resolve({ id: 'job-1' }) })
    expect(ok.status).toBe(200)
    expect(heartbeatRuntimeDispatchJob).toHaveBeenCalledWith(expect.objectContaining({ id: 'job-1', workerId: 'worker-1' }))

    const conflict = await heartbeatJob(jsonRequest('http://localhost/api/runtime/jobs/job-1/heartbeat', {
      workerId: 'wrong-worker',
    }), { params: Promise.resolve({ id: 'job-1' }) })
    expect(conflict.status).toBe(409)
  })

  it('start only moves leased jobs to running', async () => {
    const ok = await startJob(jsonRequest('http://localhost/api/runtime/jobs/job-1/start', {
      workerId: 'worker-1',
    }), { params: Promise.resolve({ id: 'job-1' }) })
    const okBody = await ok.json()
    expect(ok.status).toBe(200)
    expect(okBody.data.status).toBe('running')
    expect(okBody.attempt.status).toBe('running')
    expect(startRuntimeDispatchJob).toHaveBeenCalledWith(expect.objectContaining({ id: 'job-1', workerId: 'worker-1' }))

    const bad = await startJob(jsonRequest('http://localhost/api/runtime/jobs/not-leased/start', {
      workerId: 'worker-1',
    }), { params: Promise.resolve({ id: 'not-leased' }) })
    expect(bad.status).toBe(409)
  })

  it('fail and block write attempt and recovery metadata only', async () => {
    const failed = await failJob(jsonRequest('http://localhost/api/runtime/jobs/job-1/fail', {
      workerId: 'worker-1',
      error: { message: 'simulated failure' },
      snapshot: { stage: 'pre-execution' },
    }), { params: Promise.resolve({ id: 'job-1' }) })
    const failedBody = await failed.json()
    expect(failed.status).toBe(200)
    expect(failedBody.data.status).toBe('failed')
    expect(failedBody.attempt.status).toBe('failed')
    expect(failedBody.recovery.recoveryKind).toBe('failure_snapshot')
    expect(failRuntimeDispatchJob).toHaveBeenCalledTimes(1)

    const blocked = await blockJob(jsonRequest('http://localhost/api/runtime/jobs/job-1/block', {
      workerId: 'worker-1',
      reason: 'waiting for manual resolution',
      snapshot: { stage: 'blocked' },
    }), { params: Promise.resolve({ id: 'job-1' }) })
    const blockedBody = await blocked.json()
    expect(blocked.status).toBe(200)
    expect(blockedBody.data.status).toBe('blocked')
    expect(blockedBody.attempt.status).toBe('blocked')
    expect(blockedBody.recovery.recoveryKind).toBe('failure_snapshot')
    expect(blockRuntimeDispatchJob).toHaveBeenCalledTimes(1)
  })

  it('complete-dry-run records synthetic receipt and consumes token without connector execution', async () => {
    const response = await completeDryRunJob(jsonRequest('http://localhost/api/runtime/jobs/job-1/complete-dry-run', {
      workerId: 'worker-1',
      targetRef: 'dry-run:job-1',
      summary: 'Dry-run completion only.',
      result: { dryRun: true },
      snapshot: { stage: 'post-execute' },
    }), { params: Promise.resolve({ id: 'job-1' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.status).toBe('succeeded')
    expect(body.receipt.status).toBe('dry_run')
    expect(body.recovery.recoveryKind).toBe('post_execute')
    expect(body.token.status).toBe('consumed')
    expect(completeRuntimeDispatchJobDryRun).toHaveBeenCalledWith(expect.objectContaining({
      id: 'job-1',
      workerId: 'worker-1',
      targetRef: 'dry-run:job-1',
    }))

    const notRunning = await completeDryRunJob(jsonRequest('http://localhost/api/runtime/jobs/not-running/complete-dry-run', {
      workerId: 'worker-1',
    }), { params: Promise.resolve({ id: 'not-running' }) })
    expect(notRunning.status).toBe(409)

    const wrongLease = await completeDryRunJob(jsonRequest('http://localhost/api/runtime/jobs/job-1/complete-dry-run', {
      workerId: 'wrong-worker',
    }), { params: Promise.resolve({ id: 'job-1' }) })
    expect(wrongLease.status).toBe(409)
  })

  it('complete-obsidian-write defaults to rejecting real execution', async () => {
    const missingExecute = await completeObsidianWriteJob(jsonRequest('http://localhost/api/runtime/jobs/job-1/complete-obsidian-write', {
      workerId: 'worker-1',
    }), { params: Promise.resolve({ id: 'job-1' }) })

    expect(missingExecute.status).toBe(409)
    expect(completeRuntimeDispatchJobObsidianWrite).toHaveBeenCalledWith(expect.objectContaining({
      id: 'job-1',
      workerId: 'worker-1',
      execute: false,
    }))

    vi.mocked(completeRuntimeDispatchJobObsidianWrite).mockClear()
    const explicitFalse = await completeObsidianWriteJob(jsonRequest('http://localhost/api/runtime/jobs/job-1/complete-obsidian-write', {
      workerId: 'worker-1',
      execute: false,
    }), { params: Promise.resolve({ id: 'job-1' }) })

    expect(explicitFalse.status).toBe(409)
    expect(completeRuntimeDispatchJobObsidianWrite).toHaveBeenCalledWith(expect.objectContaining({
      execute: false,
    }))
  })

  it('complete-obsidian-write enforces connector and lease guards', async () => {
    const wrongConnector = await completeObsidianWriteJob(jsonRequest('http://localhost/api/runtime/jobs/wrong-connector/complete-obsidian-write', {
      workerId: 'worker-1',
      execute: true,
    }), { params: Promise.resolve({ id: 'wrong-connector' }) })
    expect(wrongConnector.status).toBe(409)

    const wrongLease = await completeObsidianWriteJob(jsonRequest('http://localhost/api/runtime/jobs/job-1/complete-obsidian-write', {
      workerId: 'wrong-worker',
      execute: true,
    }), { params: Promise.resolve({ id: 'job-1' }) })
    expect(wrongLease.status).toBe(409)
  })

  it('complete-obsidian-write records a real succeeded runtime receipt only after execute=true', async () => {
    const response = await completeObsidianWriteJob(jsonRequest('http://localhost/api/runtime/jobs/job-1/complete-obsidian-write', {
      workerId: 'worker-1',
      execute: true,
      vaultPath: String.raw`D:\AI-Vault`,
      snapshot: { stage: 'post-execute' },
    }), { params: Promise.resolve({ id: 'job-1' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.status).toBe('succeeded')
    expect(body.receipt.status).toBe('succeeded')
    expect(body.connectorReceipt.status).toBe('succeeded')
    expect(body.connectorReceipt.action).toBe('write_local_markdown_draft')
    expect(body.token.status).toBe('consumed')
    expect(body.recovery.recoveryKind).toBe('post_execute')
    expect(completeRuntimeDispatchJobObsidianWrite).toHaveBeenCalledWith(expect.objectContaining({
      id: 'job-1',
      workerId: 'worker-1',
      execute: true,
    }))
  })

  it('run-once dry_run calls the runner and returns a dry_run receipt', async () => {
    const response = await runOnceJob(jsonRequest('http://localhost/api/runtime/jobs/job-1/run-once', {
      workerId: 'worker-1',
      mode: 'dry_run',
      leaseDurationMs: 60000,
    }), { params: Promise.resolve({ id: 'job-1' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.claim.status).toBe('leased')
    expect(body.start.status).toBe('running')
    expect(body.data.status).toBe('succeeded')
    expect(body.receipt.status).toBe('dry_run')
    expect(body.connectorReceipt).toBeUndefined()
    expect(runRuntimeDispatchJobOnce).toHaveBeenCalledWith(expect.objectContaining({
      jobId: 'job-1',
      workerId: 'worker-1',
      mode: 'dry_run',
      execute: false,
      leaseDurationMs: 60000,
    }))
  })

  it('run-once obsidian_write requires execute=true', async () => {
    const response = await runOnceJob(jsonRequest('http://localhost/api/runtime/jobs/job-1/run-once', {
      workerId: 'worker-1',
      mode: 'obsidian_write',
    }), { params: Promise.resolve({ id: 'job-1' }) })

    expect(response.status).toBe(409)
    expect(runRuntimeDispatchJobOnce).toHaveBeenCalledWith(expect.objectContaining({
      jobId: 'job-1',
      workerId: 'worker-1',
      mode: 'obsidian_write',
      execute: false,
    }))
  })

  it('run-once obsidian_write execute=true calls the runner', async () => {
    const response = await runOnceJob(jsonRequest('http://localhost/api/runtime/jobs/job-1/run-once', {
      workerId: 'worker-1',
      mode: 'obsidian_write',
      execute: true,
      vaultPath: String.raw`D:\AI-Vault`,
    }), { params: Promise.resolve({ id: 'job-1' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.receipt.status).toBe('succeeded')
    expect(body.connectorReceipt.status).toBe('succeeded')
    expect(body.connectorReceipt.action).toBe('write_local_markdown_draft')
    expect(runRuntimeDispatchJobOnce).toHaveBeenCalledWith(expect.objectContaining({
      jobId: 'job-1',
      workerId: 'worker-1',
      mode: 'obsidian_write',
      execute: true,
      vaultPath: String.raw`D:\AI-Vault`,
    }))
  })

  it('run-once rejects missing workerId or mode', async () => {
    const missingWorker = await runOnceJob(jsonRequest('http://localhost/api/runtime/jobs/job-1/run-once', {
      mode: 'dry_run',
    }), { params: Promise.resolve({ id: 'job-1' }) })
    expect(missingWorker.status).toBe(400)

    const missingMode = await runOnceJob(jsonRequest('http://localhost/api/runtime/jobs/job-1/run-once', {
      workerId: 'worker-1',
    }), { params: Promise.resolve({ id: 'job-1' }) })
    expect(missingMode.status).toBe(400)
  })
})
