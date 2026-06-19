import {
  claimRuntimeDispatchJobById,
  completeRuntimeDispatchJobDryRun,
  completeRuntimeDispatchJobObsidianWrite,
  RuntimeExecutionApiError,
  startRuntimeDispatchJob,
} from './repository'
import { SPRINT_22_SAFETY_NOTE } from './types'

export type RuntimeRunOnceMode = 'dry_run' | 'obsidian_write'

export interface RuntimeRunOnceInput {
  jobId: string
  workerId: string
  mode: RuntimeRunOnceMode
  execute?: boolean
  vaultPath?: string
  leaseDurationMs?: number
  now?: Date
}

export async function runRuntimeDispatchJobOnce(input: RuntimeRunOnceInput) {
  const jobId = input.jobId.trim()
  const workerId = input.workerId.trim()
  if (!jobId) throw new RuntimeExecutionApiError('jobId is required.')
  if (!workerId) throw new RuntimeExecutionApiError('workerId is required.')
  if (input.mode !== 'dry_run' && input.mode !== 'obsidian_write') {
    throw new RuntimeExecutionApiError('mode must be dry_run or obsidian_write.')
  }
  if (input.mode === 'obsidian_write' && input.execute !== true) {
    throw new RuntimeExecutionApiError('obsidian_write mode requires execute=true.', 409)
  }

  const claim = await claimRuntimeDispatchJobById({
    id: jobId,
    workerId,
    leaseDurationMs: input.leaseDurationMs,
    now: input.now,
  })
  const start = await startRuntimeDispatchJob({
    id: claim.record.id,
    workerId,
    now: input.now,
  })
  const completion = input.mode === 'dry_run'
    ? await completeRuntimeDispatchJobDryRun({
      id: start.record.id,
      workerId,
      targetRef: `dry-run:${start.record.id}`,
      summary: 'Runtime run-once completed in dry-run mode without executing a connector.',
      result: { dryRun: true, executedConnector: false, runner: 'runtime-run-once' },
      snapshot: { runner: 'runtime-run-once', mode: input.mode },
      now: input.now,
    })
    : await completeRuntimeDispatchJobObsidianWrite({
      id: start.record.id,
      workerId,
      execute: true,
      vaultPath: input.vaultPath,
      snapshot: { runner: 'runtime-run-once', mode: input.mode },
      now: input.now,
    })

  return {
    claim,
    start,
    completion,
    safetyNote: SPRINT_22_SAFETY_NOTE,
  }
}
