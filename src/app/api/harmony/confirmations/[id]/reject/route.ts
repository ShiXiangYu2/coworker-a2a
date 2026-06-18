import { rejectConfirmation } from '@/lib/harmony/repository'
import { harmonyErrorResponse, readJson } from '../../../_shared'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await readOptionalJson(request)

    return Response.json(
      await rejectConfirmation(id, {
        rejectedBy:
          typeof body.rejectedBy === 'string' ? body.rejectedBy : undefined,
        decisionReason:
          typeof body.decisionReason === 'string'
            ? body.decisionReason
            : undefined,
      })
    )
  } catch (error) {
    return harmonyErrorResponse(error)
  }
}

async function readOptionalJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return await readJson(request)
  } catch {
    return {}
  }
}
