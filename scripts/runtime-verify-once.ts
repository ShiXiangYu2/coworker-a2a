import { verifyRuntimeDispatchJobOnce } from '@/lib/runtime-execution'

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`
  const value = process.argv.find((arg) => arg.startsWith(prefix))
  return value?.slice(prefix.length)
}

async function main() {
  const jobId = readArg('jobId')
  const workerId = readArg('workerId')
  const leaseDurationMsArg = readArg('leaseDurationMs')
  const leaseDurationMs = leaseDurationMsArg ? Number(leaseDurationMsArg) : undefined

  if (!jobId || !workerId) {
    throw new Error('Usage: npx tsx scripts/runtime-verify-once.ts --jobId=<id> --workerId=<id> [--leaseDurationMs=60000]')
  }

  const result = await verifyRuntimeDispatchJobOnce({
    jobId,
    workerId,
    leaseDurationMs,
  })

  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : 'Unexpected runtime verify-once error.',
  }, null, 2))
  process.exitCode = 1
})
