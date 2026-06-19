import {
  readJson,
  requiredString,
  runtimeExecutionErrorResponse,
  seedRuntimeSampleJob,
  stringValue,
} from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = await seedRuntimeSampleJob({
      taskId: requiredString(body.taskId, 'taskId'),
      createdBy: stringValue(body.createdBy),
      workerHint: stringValue(body.workerHint),
      vaultPath: stringValue(body.vaultPath),
    })
    return Response.json(result, { status: 201 })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
