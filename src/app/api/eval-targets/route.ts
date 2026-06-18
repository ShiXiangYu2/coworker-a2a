import { createEvalTarget } from '@/lib/eval/repository'
import type { EvalTargetType } from '@/lib/eval/types'
import { evalErrorResponse, readJson, stringValue } from './_shared'

const targetTypes = new Set<EvalTargetType>([
  'route_decision',
  'harmony_task',
  'agent_run',
  'agent_result',
  'memory_entry',
  'knowledge_item',
  'context_packet',
  'a2a_message',
  'tool_call',
  'tool_permission',
])

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const targetType = stringValue(body.targetType) as EvalTargetType | undefined
    const targetId = stringValue(body.targetId)
    if (!targetType || !targetTypes.has(targetType)) throw new Error('targetType is invalid.')
    if (!targetId) throw new Error('targetId is required.')

    const result = await createEvalTarget({
      targetType,
      targetId,
      source: 'api',
      idempotencyKey: stringValue(body.idempotencyKey),
      correlationId: stringValue(body.correlationId),
    })
    return Response.json(
      { ok: true, data: result.evalTarget, auditEvents: result.auditEvents },
      { status: 201 }
    )
  } catch (error) {
    return evalErrorResponse(error)
  }
}
