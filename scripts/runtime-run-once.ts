import { runRuntimeDispatchJobOnce } from '@/lib/runtime-execution'

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`
  const value = process.argv.find((arg) => arg.startsWith(prefix))
  return value?.slice(prefix.length)
}

async function main() {
  const jobId = readArg('jobId')
  const workerId = readArg('workerId')
  const mode = readArg('mode')
  const execute = readArg('execute') === 'true'
  const vaultPath = readArg('vaultPath')

  if (!jobId || !workerId || (mode !== 'dry_run' && mode !== 'obsidian_write')) {
    throw new Error('Usage: npx tsx scripts/runtime-run-once.ts --jobId=<id> --workerId=<id> --mode=dry_run|obsidian_write [--execute=true] [--vaultPath=<path>]')
  }

  const result = await runRuntimeDispatchJobOnce({
    jobId,
    workerId,
    mode,
    execute,
    vaultPath,
  })

  console.log(JSON.stringify({
    ok: true,
    jobId: result.completion.record.id,
    status: result.completion.record.status,
    receipt: result.completion.receipt,
    safetyNote: result.safetyNote,
  }, null, 2))
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : 'Unexpected runtime run-once error.',
  }, null, 2))
  process.exitCode = 1
})
