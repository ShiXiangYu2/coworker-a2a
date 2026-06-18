import { createRecoveryPoint, listRecoveryPoints } from '@/lib/observability/repository'
import { observabilityErrorResponse, readJson, stringValue } from '@/app/api/observability/_shared'
import type { ResourceType } from '@/lib/observability/types'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listRecoveryPoints({
      correlationId: url.searchParams.get('correlationId') ?? undefined,
      resourceType: url.searchParams.get('resourceType') ?? undefined,
      resourceId: url.searchParams.get('resourceId') ?? undefined,
    })
    return Response.json({ ok: true, data })
  } catch (error) {
    return observabilityErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const resourceType = stringValue(body.resourceType)
    const resourceId = stringValue(body.resourceId)
    const reason = stringValue(body.reason)
    if (!resourceType || !resourceId || !reason) {
      throw new Error('resourceType, resourceId, and reason are required.')
    }
    const data = await createRecoveryPoint({
      correlationId: stringValue(body.correlationId),
      resourceType: resourceType as ResourceType,
      resourceId,
      reason,
      snapshot: body.snapshot,
      resourceStatusAtSnapshot: stringValue(body.resourceStatusAtSnapshot),
      createdBy: stringValue(body.createdBy),
    })
    return Response.json({ ok: true, data, observabilityEvents: data.observabilityEvents })
  } catch (error) {
    return observabilityErrorResponse(error)
  }
}

