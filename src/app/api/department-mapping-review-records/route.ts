import {
  createdBy,
  createDepartmentMappingReviewRecord,
  departmentMappingErrorResponse,
  evidenceRefs,
  listDepartmentMappingReviewRecords,
  readJson,
  requiredString,
  reviewer,
  reviewTargetType,
  statusParam,
  stringValue,
  verdict,
} from '@/app/api/department-evidence-mappings/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listDepartmentMappingReviewRecords({
      status: statusParam(url.searchParams.get('status')),
      targetId: stringValue(url.searchParams.get('targetId')),
      limit: Number(url.searchParams.get('limit') ?? 50),
    })
    return Response.json({ ok: true, data: records })
  } catch (error) {
    return departmentMappingErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const result = await createDepartmentMappingReviewRecord({
      targetType: reviewTargetType(requiredString(body.targetType, 'targetType')),
      targetId: requiredString(body.targetId, 'targetId'),
      reviewer: reviewer(body.reviewer),
      verdict: verdict(body.verdict),
      reviewNotes: requiredString(body.reviewNotes, 'reviewNotes'),
      confirmationArtifactId: stringValue(body.confirmationArtifactId),
      evidenceRefs: evidenceRefs(body.evidenceRefs),
      createdBy: createdBy(body.createdBy),
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return departmentMappingErrorResponse(error)
  }
}

