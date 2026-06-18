/**
 * GET /api/external-action-proposals/:id/workflow-proposals — List workflow proposals linked to an ExternalActionProposal
 */

import { prisma } from '@/lib/prisma'
import { workflowErrorResponse } from '@/app/api/workflow-proposals/_shared'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const proposals = await prisma.workflowProposal.findMany({
      where: { sourceRecordId: id, sourceKind: 'external_action_proposal' },
      orderBy: { createdAt: 'desc' },
    })

    return Response.json({ ok: true, data: proposals })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}
