/**
 * GET /api/file-change-proposals/:id/workflow-proposals — List workflow proposals linked to a FileChangeProposal
 */

import { prisma } from '@/lib/prisma'
import { workflowErrorResponse } from '@/app/api/workflow-proposals/_shared'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const proposals = await prisma.workflowProposal.findMany({
      where: { sourceRecordId: id, sourceKind: 'file_change_proposal' },
      orderBy: { createdAt: 'desc' },
    })

    return Response.json({ ok: true, data: proposals })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}
