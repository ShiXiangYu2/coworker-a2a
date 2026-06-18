import {
  createdBy,
  departmentMappingErrorResponse,
  departmentRecordType,
  evidenceRecordType,
  listEvidenceToDepartmentMappings,
  mappingStrength,
  readJson,
  requiredString,
  statusParam,
  stringArray,
  stringValue,
  createEvidenceToDepartmentMapping,
} from './_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const records = await listEvidenceToDepartmentMappings({
      status: statusParam(url.searchParams.get('status')),
      departmentProfileId: stringValue(url.searchParams.get('departmentProfileId')),
      departmentRecordId: stringValue(url.searchParams.get('departmentRecordId')),
      evidenceRecordId: stringValue(url.searchParams.get('evidenceRecordId')),
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
    const result = await createEvidenceToDepartmentMapping({
      mappingKey: requiredString(body.mappingKey, 'mappingKey'),
      title: requiredString(body.title, 'title'),
      description: requiredString(body.description, 'description'),
      evidenceRecordType: evidenceRecordType(body.evidenceRecordType),
      evidenceRecordId: requiredString(body.evidenceRecordId, 'evidenceRecordId'),
      evidenceSummary: requiredString(body.evidenceSummary, 'evidenceSummary'),
      departmentRecordType: departmentRecordType(body.departmentRecordType),
      departmentRecordId: requiredString(body.departmentRecordId, 'departmentRecordId'),
      departmentProfileId: stringValue(body.departmentProfileId),
      mappingStrength: mappingStrength(body.mappingStrength),
      mappingRationale: requiredString(body.mappingRationale, 'mappingRationale'),
      riskNotes: stringArray(body.riskNotes),
      createdBy: createdBy(body.createdBy),
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote }, { status: 201 })
  } catch (error) {
    return departmentMappingErrorResponse(error)
  }
}
