import { createResumeToken, listResumeTokens } from '@/lib/observability/repository'
import { numberValue, observabilityErrorResponse, readJson, stringValue } from '@/app/api/observability/_shared'
import type { ResourceType } from '@/lib/observability/types'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listResumeTokens({
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
    if (!resourceType || !resourceId) throw new Error('resourceType and resourceId are required.')
    const data = await createResumeToken({
      correlationId: stringValue(body.correlationId),
      resourceType: resourceType as ResourceType,
      resourceId,
      viewContext: body.viewContext && typeof body.viewContext === 'object' && !Array.isArray(body.viewContext)
        ? body.viewContext as Record<string, unknown>
        : undefined,
      maxUses: numberValue(body.maxUses),
      expiresAt: stringValue(body.expiresAt),
      createdBy: stringValue(body.createdBy),
    })
    return Response.json({ ok: true, data, observabilityEvents: data.observabilityEvents })
  } catch (error) {
    return observabilityErrorResponse(error)
  }
}

