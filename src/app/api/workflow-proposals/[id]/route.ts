/**
 * GET /api/workflow-proposals/:id — Get single proposal with all related records
 * POST /api/workflow-proposals/:id/approve-record — Approve proposal record
 * POST /api/workflow-proposals/:id/reject — Reject proposal
 * POST /api/workflow-proposals/:id/supersede — Supersede proposal
 * POST /api/workflow-proposals/:id/archive — Archive proposal
 * POST /api/workflow-proposals/:id/submit-review — Submit proposal for review
 */

import { prisma } from '@/lib/prisma'
import { readJson, requiredString, stringValue, workflowErrorResponse, transitionProposalStatus } from '../_shared'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const proposal = await prisma.workflowProposal.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { stepIndex: 'asc' } },
        graph: true,
        assessments: { orderBy: { createdAt: 'desc' } },
        reviews: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!proposal) {
      return Response.json({ ok: false, error: { code: 'not_found', message: 'WorkflowProposal not found.' } }, { status: 404 })
    }

    return Response.json({ ok: true, data: proposal })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await readJson(request)
    const action = requiredString(body.action, 'action')
    const reason = stringValue(body.reason) ?? `Proposal ${action}`

    const actionMap: Record<string, { targetStatus: string; eventType: string }> = {
      draft: { targetStatus: 'draft', eventType: 'task.status_changed' },
      'approve-record': { targetStatus: 'approved_record', eventType: 'task.status_changed' },
      reject: { targetStatus: 'rejected', eventType: 'task.status_changed' },
      supersede: { targetStatus: 'superseded', eventType: 'task.status_changed' },
      archive: { targetStatus: 'archived', eventType: 'task.cancelled' },
      'submit-review': { targetStatus: 'review', eventType: 'task.status_changed' },
    }

    const config = actionMap[action]
    if (!config) {
      return Response.json({ ok: false, error: { code: 'invalid_action', message: `Unknown action: ${action}` } }, { status: 400 })
    }

    const result = await transitionProposalStatus(id, config.targetStatus, config.eventType, reason)
    return Response.json({ ok: true, data: result.proposal, auditEvents: [result.auditEvent] })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}
