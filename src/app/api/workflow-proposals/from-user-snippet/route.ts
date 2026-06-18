/**
 * POST /api/workflow-proposals/from-user-snippet — Create proposal from user-provided text
 *
 * Safety: Read-and-snapshot only. No source record to mutate.
 */

import { createWorkflowProposal, readJson, requiredString, stringValue, workflowErrorResponse } from '../_shared'

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const title = requiredString(body.title, 'title')
    const summary = requiredString(body.summary, 'summary')
    const snippet = requiredString(body.snippet, 'snippet')
    const workflowIntent = requiredString(body.workflowIntent, 'workflowIntent')

    const result = await createWorkflowProposal({
      title,
      summary,
      sourceKind: 'user_snippet',
      sourceEvidenceRefs: [{
        sourceType: 'user_snippet',
        summary: snippet.slice(0, 500),
        redactionStatus: 'sanitized',
        isExecutionToken: false as const,
      }],
      workflowIntent: workflowIntent as 'coordination' | 'release_review' | 'remediation_plan' | 'external_governance' | 'file_git_pr_review' | 'audit_package',
      riskLevel: (stringValue(body.riskLevel) ?? 'medium') as 'low' | 'medium' | 'high' | 'critical',
      createdBy: (stringValue(body.createdBy) ?? 'user') as 'user' | 'agent_record' | 'system_seed',
      correlationId: stringValue(body.correlationId),
      idempotencyKey: stringValue(body.idempotencyKey),
    })

    return Response.json({ ok: true, data: result.proposal, auditEvents: [result.auditEvent] }, { status: 201 })
  } catch (error) {
    return workflowErrorResponse(error)
  }
}
