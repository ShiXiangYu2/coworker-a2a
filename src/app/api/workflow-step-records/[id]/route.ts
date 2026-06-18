/**
 * GET /api/workflow-step-records/:id — Get single step record
 * POST /api/workflow-step-records/:id/approve-record — Approve step record
 * POST /api/workflow-step-records/:id/reject — Reject step record
 * POST /api/workflow-step-records/:id/archive — Archive step record
 * POST /api/workflow-step-records/:id/submit-review — Submit step for review
 */

import { prisma } from '@/lib/prisma'
import { readJson, requiredString, stringValue, workflowErrorResponse } from '@/app/api/workflow-proposals/_shared'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const step = await prisma.workflowStepRecord.findUnique({ where: { id } })

    if (!step) {
      return Response.json({ ok: false, error: { code: 'not_found', message: 'WorkflowStepRecord not found.' } }, { status: 404 })
    }

    return Response.json({ ok: true, data: step })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await readJson(request)
    const action = requiredString(body.action, 'action')
    const reason = stringValue(body.reason) ?? `Step ${action}`

    const allowed: Record<string, { targetStatus: string; eventType: string }> = {
      'approve-record': { targetStatus: 'approved_record', eventType: 'task.status_changed' },
      reject: { targetStatus: 'rejected', eventType: 'task.status_changed' },
      archive: { targetStatus: 'archived', eventType: 'task.cancelled' },
      'submit-review': { targetStatus: 'review', eventType: 'task.status_changed' },
    }

    const config = allowed[action]
    if (!config) {
      return Response.json({ ok: false, error: { code: 'invalid_action', message: `Unknown action: ${action}` } }, { status: 400 })
    }

    const step = await prisma.workflowStepRecord.findUnique({ where: { id } })
    if (!step) {
      return Response.json({ ok: false, error: { code: 'not_found', message: 'WorkflowStepRecord not found.' } }, { status: 404 })
    }

    const transitionMap: Record<string, string[]> = {
      proposal: ['draft', 'archived'],
      draft: ['review', 'superseded', 'archived'],
      review: ['approved_record', 'rejected', 'superseded', 'archived'],
      approved_record: ['archived'],
      rejected: ['archived'],
      superseded: ['archived'],
    }

    if (!transitionMap[step.status]?.includes(config.targetStatus)) {
      return Response.json(
        { ok: false, error: { code: 'invalid_transition', message: `Cannot transition from "${step.status}" to "${config.targetStatus}".` } },
        { status: 400 }
      )
    }

    const updated = await prisma.workflowStepRecord.update({
      where: { id },
      data: { status: config.targetStatus },
    })

    const auditEvent = await prisma.harmonyAuditEvent.create({
      data: {
        correlationId: step.correlationId,
        eventType: config.eventType,
        actorType: 'user',
        reason,
        payloadJson: JSON.stringify({ entityType: 'WorkflowStepRecord', entityId: id }),
      },
    })

    return Response.json({ ok: true, data: updated, auditEvents: [auditEvent] })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}
