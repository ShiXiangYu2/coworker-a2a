import { mvpClosureErrorResponse, readJson, stringValue, transitionMVPRecordStatus } from '../../_shared'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await readJson(request)
    const result = await transitionMVPRecordStatus({
      recordType: 'mvp_readiness_record',
      id,
      targetStatus: 'rejected',
      reason: stringValue(body.reason) ?? 'Rejected local MVP readiness record.',
    })
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote })
  } catch (error) {
    return mvpClosureErrorResponse(error)
  }
}

