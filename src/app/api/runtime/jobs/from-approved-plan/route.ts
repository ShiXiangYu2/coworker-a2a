import {
  issueRuntimeExecutionFromApprovedPlan,
  readJson,
  requiredString,
  runtimeExecutionErrorResponse,
  stringValue,
} from '../../_shared'

function requiredObject(
  value: unknown,
  name: string
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} is required and must be an object.`)
  }
  return value as Record<string, unknown>
}

function requiredBooleanTrue(value: unknown, name: string): true {
  if (typeof value !== 'boolean') {
    throw new Error(`${name} is required and must be a boolean.`)
  }
  return value as true
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const payload = requiredObject(body.payload, 'payload')
    const scope = requiredObject(body.scope, 'scope')
    const result = await issueRuntimeExecutionFromApprovedPlan({
      taskId: requiredString(body.taskId, 'taskId'),
      agentRunId: requiredString(body.agentRunId, 'agentRunId'),
      executionPlanRecordId: requiredString(body.executionPlanRecordId, 'executionPlanRecordId'),
      executionApprovalRecordId: requiredString(body.executionApprovalRecordId, 'executionApprovalRecordId'),
      approvedBy: requiredString(body.approvedBy, 'approvedBy') as 'kelvin' | 'operator',
      issuedBy: (stringValue(body.issuedBy) ?? 'system_dispatcher') as 'system_dispatcher' | 'operator' | 'kelvin',
      approvalStatus: requiredString(body.approvalStatus, 'approvalStatus') as 'approved',
      connectorId: requiredString(body.connectorId, 'connectorId') as 'obsidian_local',
      actionType: requiredString(body.actionType, 'actionType') as 'write_local_markdown_draft',
      riskLevel: requiredString(body.riskLevel, 'riskLevel') as 'low',
      requiresHumanApproval: requiredBooleanTrue(body.requiresHumanApproval, 'requiresHumanApproval'),
      idempotencyKey: requiredString(body.idempotencyKey, 'idempotencyKey'),
      correlationId: stringValue(body.correlationId),
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined,
      maxAttempts: typeof body.maxAttempts === 'number' ? body.maxAttempts : undefined,
      summary: requiredString(body.summary, 'summary'),
      payload: {
        draftTitle: requiredString(payload.draftTitle, 'payload.draftTitle'),
        filename: requiredString(payload.filename, 'payload.filename'),
        content: requiredString(payload.content, 'payload.content'),
        targetDirectoryLabel: requiredString(payload.targetDirectoryLabel, 'payload.targetDirectoryLabel') as 'Inbox/AI Drafts',
      },
      scope: {
        connectorId: requiredString(scope.connectorId, 'scope.connectorId') as 'obsidian_local',
        actionType: requiredString(scope.actionType, 'scope.actionType') as 'write_local_markdown_draft',
        allowedVaultRoot: requiredString(scope.allowedVaultRoot, 'scope.allowedVaultRoot'),
        allowedTargetDirectoryLabel: requiredString(scope.allowedTargetDirectoryLabel, 'scope.allowedTargetDirectoryLabel') as 'Inbox/AI Drafts',
        allowedFilename: requiredString(scope.allowedFilename, 'scope.allowedFilename'),
        taskId: requiredString(scope.taskId, 'scope.taskId'),
        agentRunId: requiredString(scope.agentRunId, 'scope.agentRunId'),
        executionPlanRecordId: requiredString(scope.executionPlanRecordId, 'scope.executionPlanRecordId'),
        idempotencyKey: requiredString(scope.idempotencyKey, 'scope.idempotencyKey'),
        expiresAt: requiredString(scope.expiresAt, 'scope.expiresAt'),
      },
    })

    return Response.json({
      ok: true,
      token: result.token,
      job: result.job,
      auditEvents: result.auditEvents,
      safetyNote: result.safetyNote,
    }, { status: 201 })
  } catch (error) {
    return runtimeExecutionErrorResponse(error)
  }
}
