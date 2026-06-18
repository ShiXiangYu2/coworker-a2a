import {
  createdBy,
  createDepartmentReviewGap,
  departmentMappingErrorResponse,
  departmentRecordType,
  listDepartmentReviewGaps,
  readJson,
  requiredString,
  riskLevel,
  statusParam,
  stringArray,
  stringValue,
} from '@/app/api/department-evidence-mappings/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listDepartmentReviewGaps({
      status: statusParam(url.searchParams.get('status')),
      departmentProfileId: stringValue(url.searchParams.get('departmentProfileId')),
      departmentRecordId: stringValue(url.searchParams.get('departmentRecordId')),
      mappingRecordId: stringValue(url.searchParams.get('mappingRecordId')),
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
    const result = await createDepartmentReviewGap({
      mappingRecordId: stringValue(body.mappingRecordId),
      departmentProfileId: requiredString(body.departmentProfileId, 'departmentProfileId'),
      departmentRecordType: departmentRecordType(body.departmentRecordType),
      departmentRecordId: requiredString(body.departmentRecordId, 'departmentRecordId'),
      gapType: requiredString(body.gapType, 'gapType'),
      gapSummary: requiredString(body.gapSummary, 'gapSummary'),
      riskLevel: riskLevel(body.riskLevel),
      recommendedEvidence: stringArray(body.recommendedEvidence),
      createdBy: createdBy(body.createdBy),
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return departmentMappingErrorResponse(error)
  }
}

