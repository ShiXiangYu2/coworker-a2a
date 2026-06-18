import { evidenceErrorResponse, transitionReviewRecord } from '@/app/api/evidence/_shared'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await transitionReviewRecord(id, 'archived', 'Archived local evidence review record only.')
    return Response.json({ ok: true, data: result.record, auditEvents: [result.auditEvent], safetyNote: result.safetyNote })
  } catch (error) {
    return evidenceErrorResponse(error)
  }
}
