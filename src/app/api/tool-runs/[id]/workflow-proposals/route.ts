/**
 * GET /api/tool-runs/:id/workflow-proposals — List workflow proposals linked to a ToolRun
 */

import { prisma } from '@/lib/prisma'
import { workflowErrorResponse } from '@/app/api/workflow-proposals/_shared'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const proposals = await prisma.workflowProposal.findMany({
      where: { sourceRecordId: id, sourceKind: 'tool_run' },
      orderBy: { createdAt: 'desc' },
    })

    return Response.json({ ok: true, data: proposals })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}
