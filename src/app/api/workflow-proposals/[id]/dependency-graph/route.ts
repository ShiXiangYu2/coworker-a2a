/**
 * GET /api/workflow-proposals/:id/dependency-graph — Get dependency graph
 * POST /api/workflow-proposals/:id/dependency-graph — Create dependency graph
 */

import { prisma } from '@/lib/prisma'
import { createWorkflowGraph, readJson, workflowErrorResponse } from '../../_shared'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const graph = await prisma.workflowDependencyGraph.findUnique({
      where: { workflowProposalId: id },
    })

    if (!graph) {
      return Response.json({ ok: true, data: null })
    }

    return Response.json({ ok: true, data: graph })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await readJson(request)

    const nodes = Array.isArray(body.nodes)
      ? body.nodes.map((n: Record<string, unknown>) => ({
          id: String(n.id ?? ''),
          nodeType: String(n.nodeType ?? 'workflow_step'),
          recordId: n.recordId ? String(n.recordId) : undefined,
          label: String(n.label ?? ''),
        }))
      : []

    const edges = Array.isArray(body.edges)
      ? body.edges.map((e: Record<string, unknown>) => ({
          fromNodeId: String(e.fromNodeId ?? ''),
          toNodeId: String(e.toNodeId ?? ''),
          relation: String(e.relation ?? 'depends_on'),
        }))
      : []

    const result = await createWorkflowGraph({
      workflowProposalId: id,
      nodes,
      edges,
      graphIntegrityStatus: String(body.graphIntegrityStatus ?? 'valid'),
      cycleDetected: typeof body.cycleDetected === 'boolean' ? body.cycleDetected : false,
      missingReferenceCount: typeof body.missingReferenceCount === 'number' ? body.missingReferenceCount : 0,
    })

    return Response.json({ ok: true, data: result.graph }, { status: 201 })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}
