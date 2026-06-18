import { NextRequest } from 'next/server'
import {
  archiveEvidence,
  getEvidenceById,
  SPRINT_17_SAFETY_NOTE,
} from '@/lib/evidence'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const item = await getEvidenceById(id)
    if (!item) {
      return Response.json({ ok: false, error: 'Evidence not found' }, { status: 404 })
    }
    return Response.json({ ok: true, data: item, safetyNote: SPRINT_17_SAFETY_NOTE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const item = await archiveEvidence(id)
    if (!item) {
      return Response.json({ ok: false, error: 'Evidence not found' }, { status: 404 })
    }
    return Response.json({
      ok: true,
      data: item,
      safetyNote: `${SPRINT_17_SAFETY_NOTE} DELETE is compatibility-only and archives the local evidence record; it does not delete source data.`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
