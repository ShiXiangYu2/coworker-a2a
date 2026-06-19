import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  blockRuntimeDispatchJob,
  buildRuntimeOperatorTaskViewModel,
  claimRuntimeDispatchJob,
  completeRuntimeDispatchJobDryRun,
  completeRuntimeDispatchJobObsidianWrite,
  createRuntimeDispatchJob,
  createRuntimeExecutionToken,
  failRuntimeDispatchJob,
  getRuntimeDispatchJobById,
  getRuntimeDispatchJobTimeline,
  getTaskRuntimeExecutionSummary,
  getRuntimeExecutionReceiptByJobId,
  getRuntimeExecutionTokenById,
  heartbeatRuntimeDispatchJob,
  listRuntimeDispatchAttempts,
  listRuntimeDispatchJobs,
  listRuntimeExecutionTokens,
  listRuntimeRecoveryPoints,
  runRuntimeDispatchJobOnce,
  seedRuntimeSampleJob,
  startRuntimeDispatchJob,
} from '@/lib/runtime-execution'
import { POST as createToken, GET as listTokens } from '../tokens/route'
import { GET as getToken } from '../tokens/[id]/route'
import { POST as createJob, GET as listJobs } from '../jobs/route'
import { POST as seedSampleJob } from '../seed-sample-job/route'
import { GET as getJob } from '../jobs/[id]/route'
import { GET as getJobTimeline } from '../jobs/[id]/timeline/route'
import { POST as claimJob } from '../jobs/claim/route'
import { POST as heartbeatJob } from '../jobs/[id]/heartbeat/route'
import { POST as startJob } from '../jobs/[id]/start/route'
import { POST as failJob } from '../jobs/[id]/fail/route'
import { POST as blockJob } from '../jobs/[id]/block/route'
import { POST as completeDryRunJob } from '../jobs/[id]/complete-dry-run/route'
import { POST as completeObsidianWriteJob } from '../jobs/[id]/complete-obsidian-write/route'
import { POST as runOnceJob } from '../jobs/[id]/run-once/route'
import { GET as getJobAttempts } from '../jobs/[id]/attempts/route'
import { GET as getJobReceipt } from '../jobs/[id]/receipt/route'
import { GET as getJobRecovery } from '../jobs/[id]/recovery/route'
import { GET as getTaskRuntimeJobs } from '../../tasks/[id]/runtime-jobs/route'
import { GET as getTaskRuntimeSummary } from '../../tasks/[id]/runtime-summary/route'
import { GET as getTaskRuntimeOperatorView } from '../../tasks/[id]/runtime-operator-view/route'

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
    listRuntimeDispatchAttempts: vi.fn(async (jobId) => [
      { id: 'attempt-1', jobId, attempt: 1, status: 'leased', workerId: 'worker-1' },
      { id: 'attempt-2', jobId, attempt: 1, status: 'running', workerId: 'worker-1' },
    ]),
    getRuntimeExecutionReceiptByJobId: vi.fn(async (jobId) => jobId === 'missing-receipt'
      ? null
      : { id: 'receipt-1', jobId, status: 'dry_run', resultJson: JSON.stringify({ dryRun: true }) }),
    listRuntimeRecoveryPoints: vi.fn(async (jobId) => [
      { id: 'recovery-1', jobId, recoveryKind: 'post_execute', snapshotJson: JSON.stringify({ dryRun: true }) },
    ]),
    getRuntimeExecutionTokenById: vi.fn(async (id) => id === 'missing' ? null : { id, status: 'draft' }),
    getRuntimeDispatchJobById: vi.fn(async (id) => id === 'missing' ? null : { id, status: 'queued' }),
    getRuntimeDispatchJobTimeline: vi.fn(async (id) => {
      if (id === 'missing') throw new RuntimeExecutionApiError('Runtime dispatch job not found.', 404)
      return {
        job: { id, status: 'succeeded', runtimeTokenId: 'token-1' },
        token: { id: 'token-1', status: 'consumed' },
        attempts: [
          { id: 'attempt-1', jobId: id, status: 'leased' },
          { id: 'attempt-2', jobId: id, status: 'running' },
        ],
        receipt: { id: 'receipt-1', jobId: id, status: 'dry_run' },
        recovery: [{ id: 'recovery-1', jobId: id, recoveryKind: 'post_execute' }],
        derived: {
          hasReceipt: true,
          receiptStatus: 'dry_run',
          attemptCount: 2,
          recoveryCount: 1,
          isTerminal: true,
          leaseActive: false,
          issuedRuntimeTokenActive: false,
          awaitingRuntimeExecution: false,
        },
        safetyNote,
      }
    }),
    getTaskRuntimeExecutionSummary: vi.fn(async (taskId) => taskId === 'empty-task'
      ? {
        taskId,
        jobs: [],
        counts: {
          total: 0,
          queued: 0,
          leased: 0,
          running: 0,
          succeeded: 0,
          failed: 0,
          blocked: 0,
          cancelled: 0,
        },
        receipts: {
          dryRunCount: 0,
          succeededCount: 0,
        },
        derived: {
          hasAnyLiveJob: false,
          hasAnySucceededJob: false,
          hasAnyAwaitingRuntimeExecution: false,
          latestJobId: null,
        },
        safetyNote,
      }
      : {
        taskId,
        jobs: [
          {
            job: { id: 'job-1', status: 'queued', runtimeTokenId: 'token-1' },
            token: { id: 'token-1', status: 'active' },
            attempts: [],
            receipt: null,
            recovery: [],
            derived: {
              hasReceipt: false,
              receiptStatus: null,
              attemptCount: 0,
              recoveryCount: 0,
              isTerminal: false,
              leaseActive: false,
              issuedRuntimeTokenActive: true,
              awaitingRuntimeExecution: true,
            },
            safetyNote,
          },
        ],
        counts: {
          total: 1,
          queued: 1,
          leased: 0,
          running: 0,
          succeeded: 0,
          failed: 0,
          blocked: 0,
          cancelled: 0,
        },
        receipts: {
          dryRunCount: 0,
          succeededCount: 0,
        },
        derived: {
          hasAnyLiveJob: true,
          hasAnySucceededJob: false,
          hasAnyAwaitingRuntimeExecution: true,
          latestJobId: 'job-1',
        },
        safetyNote,
      }),
    buildRuntimeOperatorTaskViewModel: vi.fn(async (taskId) => ({
      taskId,
      summary: {
        taskId,
        jobs: [],
        counts: {
          total: 0,
          queued: 0,
          leased: 0,
          running: 0,
          succeeded: 0,
          failed: 0,
          blocked: 0,
          cancelled: 0,
        },
        receipts: {
          dryRunCount: 0,
          succeededCount: 0,
        },
        derived: {
          hasAnyLiveJob: false,
          hasAnySucceededJob: false,
          hasAnyAwaitingRuntimeExecution: false,
          latestJobId: null,
        },
        safetyNote,
      },
      latestJob: null,
      latestReceipt: null,
      jobs: [],
      statusBands: {
        live: [],
        succeeded: [],
        blocked: [],
        failed: [],
      },
      highlight: {
        primaryStatus: 'empty',
        primaryHint: null,
        latestJobId: null,
        latestReceiptStatus: null,
        hasActionableLiveJob: false,
      },
      safetyNote,
    })),
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
    seedRuntimeSampleJob: vi.fn(async ({ taskId, createdBy, workerHint, vaultPath }) => ({
      ok: true,
      tokenId: 'token-seed-1',
      jobId: 'job-seed-1',
      taskId,
      correlationId: 'runtime-seed-corr-1',
      idempotencyKey: 'runtime-seed-idem-1',
      connectorId: 'obsidian_local',
      actionType: 'write_local_markdown_draft',
      createdBy,
      nextCommands: {
        verifyDryRun: `npx tsx scripts/runtime-verify-once.ts --jobId=job-seed-1 --workerId=${workerHint ?? 'worker-dev-1'}`,
        runDryRun: `npx tsx scripts/runtime-run-once.ts --jobId=job-seed-1 --workerId=${workerHint ?? 'worker-dev-1'} --mode=dry_run`,
        runObsidianWrite: `npx tsx scripts/runtime-run-once.ts --jobId=job-seed-1 --workerId=${workerHint ?? 'worker-dev-1'} --mode=obsidian_write --execute=true --vaultPath=${vaultPath ?? String.raw`D:\AI-Vault`}`,
      },
      safetyNote,
    })),
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

const runtimeWorkerHeaders = {
  authorization: 'Bearer test-runtime-secret',
  'x-runtime-worker-id': 'worker-1',
}

const originalRuntimeWorkerSecret = process.env.RUNTIME_WORKER_SECRET

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...runtimeWorkerHeaders },
    body: JSON.stringify(body),
  })
}

function unauthenticatedJsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function workerMismatchJsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: 'Bearer test-runtime-secret',
      'x-runtime-worker-id': 'worker-2',
    },
    body: JSON.stringify(body),
  })
}

function authenticatedWorkerJsonRequest(url: string, workerId: string, body: Record<string, unknown>): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: 'Bearer test-runtime-secret',
      'x-runtime-worker-id': workerId,
    },
    body: JSON.stringify(body),
  })
}

describe('Sprint 22 Runtime API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.RUNTIME_WORKER_SECRET = 'test-runtime-secret'
  })

  afterEach(() => {
    if (originalRuntimeWorkerSecret === undefined) {
      delete process.env.RUNTIME_WORKER_SECRET
    } else {
      process.env.RUNTIME_WORKER_SECRET = originalRuntimeWorkerSecret
    }
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

  it('seeds a sample runtime token and queued job without execution', async () => {
    const response = await seedSampleJob(jsonRequest('http://localhost/api/runtime/seed-sample-job', {
      taskId: 'task-seed-1',
      createdBy: 'api-test',
      workerHint: 'worker-seed-1',
      vaultPath: String.raw`D:\AI-Vault`,
    }))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.tokenId).toBe('token-seed-1')
    expect(body.jobId).toBe('job-seed-1')
    expect(body.correlationId).toBe('runtime-seed-corr-1')
    expect(body.idempotencyKey).toBe('runtime-seed-idem-1')
    expect(body.nextCommands.verifyDryRun).toContain('scripts/runtime-verify-once.ts')
    expect(body.nextCommands.runDryRun).toContain('--mode=dry_run')
    expect(body.nextCommands.runObsidianWrite).toContain('--execute=true')
    expect(body.safetyNote).toContain('Sprint 22')
    expect(seedRuntimeSampleJob).toHaveBeenCalledWith({
      taskId: 'task-seed-1',
      createdBy: 'api-test',
      workerHint: 'worker-seed-1',
      vaultPath: String.raw`D:\AI-Vault`,
    })
    expect(runRuntimeDispatchJobOnce).not.toHaveBeenCalled()
    expect(completeRuntimeDispatchJobDryRun).not.toHaveBeenCalled()
    expect(completeRuntimeDispatchJobObsidianWrite).not.toHaveBeenCalled()
  })

  it('rejects sample seed requests without taskId', async () => {
    const response = await seedSampleJob(jsonRequest('http://localhost/api/runtime/seed-sample-job', {
      createdBy: 'api-test',
    }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.message).toContain('taskId is required')
    expect(seedRuntimeSampleJob).not.toHaveBeenCalled()
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

  it('queries task runtime summary without execution', async () => {
    const response = await getTaskRuntimeSummary(new Request('http://localhost/api/tasks/task-1/runtime-summary'), {
      params: Promise.resolve({ id: 'task-1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.taskId).toBe('task-1')
    expect(body.data.jobs).toHaveLength(1)
    expect(body.data.counts.total).toBe(1)
    expect(body.data.receipts.succeededCount).toBe(0)
    expect(body.data.derived).toEqual({
      hasAnyLiveJob: true,
      hasAnySucceededJob: false,
      hasAnyAwaitingRuntimeExecution: true,
      latestJobId: 'job-1',
    })
    expect(body.safetyNote).toContain('Sprint 22')
    expect(getTaskRuntimeExecutionSummary).toHaveBeenCalledWith('task-1')
    expect(runRuntimeDispatchJobOnce).not.toHaveBeenCalled()
    expect(completeRuntimeDispatchJobDryRun).not.toHaveBeenCalled()
    expect(completeRuntimeDispatchJobObsidianWrite).not.toHaveBeenCalled()
  })

  it('returns an empty task runtime summary when no jobs exist', async () => {
    const response = await getTaskRuntimeSummary(new Request('http://localhost/api/tasks/empty-task/runtime-summary'), {
      params: Promise.resolve({ id: 'empty-task' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.taskId).toBe('empty-task')
    expect(body.data.jobs).toEqual([])
    expect(body.data.counts.total).toBe(0)
    expect(body.data.derived.latestJobId).toBeNull()
    expect(getTaskRuntimeExecutionSummary).toHaveBeenCalledWith('empty-task')
  })

  it('queries task runtime operator view without execution', async () => {
    const response = await getTaskRuntimeOperatorView(new Request('http://localhost/api/tasks/task-1/runtime-operator-view'), {
      params: Promise.resolve({ id: 'task-1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.taskId).toBe('task-1')
    expect(body.data.summary.taskId).toBe('task-1')
    expect(body.data.latestJob).toBeNull()
    expect(body.data.latestReceipt).toBeNull()
    expect(body.data.statusBands.live).toEqual([])
    expect(body.data.highlight.primaryStatus).toBe('empty')
    expect(body.safetyNote).toContain('Sprint 22')
    expect(buildRuntimeOperatorTaskViewModel).toHaveBeenCalledWith('task-1')
    expect(runRuntimeDispatchJobOnce).not.toHaveBeenCalled()
    expect(completeRuntimeDispatchJobDryRun).not.toHaveBeenCalled()
    expect(completeRuntimeDispatchJobObsidianWrite).not.toHaveBeenCalled()
  })

  it('queries runtime attempts, receipt, and recovery metadata without execution', async () => {
    const attempts = await getJobAttempts(new Request('http://localhost/api/runtime/jobs/job-1/attempts'), {
      params: Promise.resolve({ id: 'job-1' }),
    })
    const attemptsBody = await attempts.json()
    expect(attempts.status).toBe(200)
    expect(attemptsBody.data).toHaveLength(2)
    expect(attemptsBody.safetyNote).toContain('Sprint 22')
    expect(listRuntimeDispatchAttempts).toHaveBeenCalledWith('job-1')

    const receipt = await getJobReceipt(new Request('http://localhost/api/runtime/jobs/job-1/receipt'), {
      params: Promise.resolve({ id: 'job-1' }),
    })
    const receiptBody = await receipt.json()
    expect(receipt.status).toBe(200)
    expect(receiptBody.data.id).toBe('receipt-1')
    expect(getRuntimeExecutionReceiptByJobId).toHaveBeenCalledWith('job-1')

    const recovery = await getJobRecovery(new Request('http://localhost/api/runtime/jobs/job-1/recovery'), {
      params: Promise.resolve({ id: 'job-1' }),
    })
    const recoveryBody = await recovery.json()
    expect(recovery.status).toBe(200)
    expect(recoveryBody.data[0].recoveryKind).toBe('post_execute')
    expect(listRuntimeRecoveryPoints).toHaveBeenCalledWith('job-1')

    expect(runRuntimeDispatchJobOnce).not.toHaveBeenCalled()
    expect(completeRuntimeDispatchJobDryRun).not.toHaveBeenCalled()
    expect(completeRuntimeDispatchJobObsidianWrite).not.toHaveBeenCalled()
  })

  it('queries runtime timeline summary without execution', async () => {
    const response = await getJobTimeline(new Request('http://localhost/api/runtime/jobs/job-1/timeline'), {
      params: Promise.resolve({ id: 'job-1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.job.id).toBe('job-1')
    expect(body.data.token.id).toBe('token-1')
    expect(body.data.attempts).toHaveLength(2)
    expect(body.data.receipt.status).toBe('dry_run')
    expect(body.data.recovery[0].recoveryKind).toBe('post_execute')
    expect(body.data.derived).toEqual({
      hasReceipt: true,
      receiptStatus: 'dry_run',
      attemptCount: 2,
      recoveryCount: 1,
      isTerminal: true,
      leaseActive: false,
      issuedRuntimeTokenActive: false,
      awaitingRuntimeExecution: false,
    })
    expect(body.safetyNote).toContain('Sprint 22')
    expect(getRuntimeDispatchJobTimeline).toHaveBeenCalledWith('job-1')
    expect(runRuntimeDispatchJobOnce).not.toHaveBeenCalled()
    expect(completeRuntimeDispatchJobDryRun).not.toHaveBeenCalled()
    expect(completeRuntimeDispatchJobObsidianWrite).not.toHaveBeenCalled()
  })

  it('returns not_found for missing runtime timeline jobs', async () => {
    const response = await getJobTimeline(new Request('http://localhost/api/runtime/jobs/missing/timeline'), {
      params: Promise.resolve({ id: 'missing' }),
    })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('runtime_execution_error')
    expect(body.error.message).toContain('Runtime dispatch job not found')
    expect(getRuntimeDispatchJobTimeline).toHaveBeenCalledWith('missing')
  })

  it('returns not_found for missing runtime receipt', async () => {
    const response = await getJobReceipt(new Request('http://localhost/api/runtime/jobs/missing-receipt/receipt'), {
      params: Promise.resolve({ id: 'missing-receipt' }),
    })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('not_found')
    expect(body.safetyNote).toContain('Sprint 22')
    expect(getRuntimeExecutionReceiptByJobId).toHaveBeenCalledWith('missing-receipt')
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

  it('rejects runtime worker requests without worker authentication', async () => {
    const response = await claimJob(unauthenticatedJsonRequest('http://localhost/api/runtime/jobs/claim', {
      workerId: 'worker-1',
    }))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error.message).toContain('authentication is required')
    expect(claimRuntimeDispatchJob).not.toHaveBeenCalled()
  })

  it('rejects runtime worker requests when authenticated worker does not match body workerId', async () => {
    const response = await startJob(workerMismatchJsonRequest('http://localhost/api/runtime/jobs/job-1/start', {
      workerId: 'worker-1',
    }), { params: Promise.resolve({ id: 'job-1' }) })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error.message).toContain('does not match request workerId')
    expect(startRuntimeDispatchJob).not.toHaveBeenCalled()
  })

  it('heartbeat requires matching leaseOwner', async () => {
    const ok = await heartbeatJob(jsonRequest('http://localhost/api/runtime/jobs/job-1/heartbeat', {
      workerId: 'worker-1',
      leaseDurationMs: 60000,
    }), { params: Promise.resolve({ id: 'job-1' }) })
    expect(ok.status).toBe(200)
    expect(heartbeatRuntimeDispatchJob).toHaveBeenCalledWith(expect.objectContaining({ id: 'job-1', workerId: 'worker-1' }))

    const conflict = await heartbeatJob(authenticatedWorkerJsonRequest('http://localhost/api/runtime/jobs/job-1/heartbeat', 'wrong-worker', {
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

    const wrongLease = await completeDryRunJob(authenticatedWorkerJsonRequest('http://localhost/api/runtime/jobs/job-1/complete-dry-run', 'wrong-worker', {
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

    const wrongLease = await completeObsidianWriteJob(authenticatedWorkerJsonRequest('http://localhost/api/runtime/jobs/job-1/complete-obsidian-write', 'wrong-worker', {
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
