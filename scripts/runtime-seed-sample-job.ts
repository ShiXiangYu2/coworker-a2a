import { seedRuntimeSampleJob } from '@/lib/runtime-execution'

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`
  const value = process.argv.find((arg) => arg.startsWith(prefix))
  return value?.slice(prefix.length)
}

async function main() {
  const taskId = readArg('taskId')
  const createdBy = readArg('createdBy')
  const workerHint = readArg('workerHint')
  const vaultPath = readArg('vaultPath')

  if (!taskId) {
    throw new Error('Usage: npx tsx scripts/runtime-seed-sample-job.ts --taskId=<id> [--createdBy=<name>] [--workerHint=worker-dev-1] [--vaultPath=<path>]')
  }

  const result = await seedRuntimeSampleJob({
    taskId,
    createdBy,
    workerHint,
    vaultPath,
  })

  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : 'Unexpected runtime seed sample job error.',
  }, null, 2))
  process.exitCode = 1
})
