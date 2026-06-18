import { NextRequest } from 'next/server'
import {
  createEvidenceImportRecord,
  listEvidence,
  SPRINT_17_SAFETY_NOTE,
} from '@/lib/evidence'
import {
  EvidenceSafetyViolationError,
  EvidenceValidationError,
} from '@/lib/evidence/validator'
import type { EvidenceSource } from '@/lib/evidence/types'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const data = await listEvidence({
      source: (url.searchParams.get('source') as EvidenceSource) ?? undefined,
      agentId: url.searchParams.get('agentId') ?? undefined,
      taskType: url.searchParams.get('taskType') ?? undefined,
      status: (url.searchParams.get('status') as never) ?? undefined,
      limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
    })
    return Response.json({ ok: true, data, safetyNote: SPRINT_17_SAFETY_NOTE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ ok: false, error: message }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userProvidedSummary =
      stringValue(body.userProvidedSummary) ??
      stringValue(body.summary) ??
      stringValue(body.content) ??
      stringValue(body.text)

    if (!userProvidedSummary) {
      throw new EvidenceValidationError(
        'userProvidedSummary is required. Legacy content/text is treated as a user-provided summary only.'
      )
    }

    const result = await createEvidenceImportRecord({
      sourceKind: (body.sourceKind ?? body.source ?? 'manual_note') as EvidenceSource,
      title: stringValue(body.title) ?? 'User Provided Evidence Summary',
      userProvidedSummary,
      importedContentSummary: stringValue(body.importedContentSummary),
      sourceMetadata: {
        urlHint: stringValue(body.sourceUrl),
        externalSystemName: stringValue(body.sourceId),
      },
      createdBy: body.importedBy === 'operator' ? 'operator' : 'user',
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })

    return Response.json({
      ok: true,
      data: result.record,
      snapshot: result.snapshot,
      auditEvents: result.auditEvents,
      safetyNote: SPRINT_17_SAFETY_NOTE,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof EvidenceValidationError || error instanceof EvidenceSafetyViolationError) {
      return Response.json({ ok: false, error: error.message }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
