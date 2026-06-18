import { createReviewPatchRecord, listReviewPatchRecords } from '@/lib/file-git-pr/repository'
import { fileGitPrErrorResponse, readJson, stringValue } from '../file-change-proposals/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listReviewPatchRecords({
      resourceType: url.searchParams.get('resourceType') ?? undefined,
      resourceId: url.searchParams.get('resourceId') ?? undefined,
    })
    return Response.json({ ok: true, data })
  } catch (error) {
    return fileGitPrErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const resourceType = stringValue(body.resourceType)
    const resourceId = stringValue(body.resourceId)
    const summary = stringValue(body.summary)
    if (!resourceType) throw new Error('resourceType is required.')
    if (!resourceId) throw new Error('resourceId is required.')
    if (!summary) throw new Error('summary is required.')
    const result = await createReviewPatchRecord({
      resourceType: resourceType as never,
      resourceId,
      taskId: stringValue(body.taskId),
      reviewerType: stringValue(body.reviewerType) as never,
      reviewerId: stringValue(body.reviewerId),
      verdict: stringValue(body.verdict) as never,
      summary,
      findings: Array.isArray(body.findings) ? body.findings as never : undefined,
      requiresHumanConfirmation: typeof body.requiresHumanConfirmation === 'boolean' ? body.requiresHumanConfirmation : undefined,
    })
    return Response.json({ ok: true, data: result.reviewPatchRecord, auditEvents: result.auditEvents, observabilityEvents: result.observabilityEvents }, { status: 201 })
  } catch (error) {
    return fileGitPrErrorResponse(error)
  }
}
