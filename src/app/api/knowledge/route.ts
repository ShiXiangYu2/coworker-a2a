import { createKnowledgeItem, listKnowledge } from '@/lib/memory/repository'
import { memoryErrorResponse, readJson, stringArray, stringValue } from '../memory/_shared'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const data = await listKnowledge({
      status: stringValue(url.searchParams.get('status')),
      agentId: stringValue(url.searchParams.get('agentId')),
      tag: stringValue(url.searchParams.get('tag')),
    })
    return Response.json({ ok: true, data })
  } catch (error) {
    return memoryErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    const data = await createKnowledgeItem({
      title: stringValue(body.title) ?? '',
      content: stringValue(body.content) ?? '',
      kind: stringValue(body.kind) as never,
      scope: stringValue(body.scope) as never,
      projectId: stringValue(body.projectId),
      sprint: stringValue(body.sprint),
      agentId: stringValue(body.agentId) as never,
      sourceType: stringValue(body.sourceType) as never,
      sourcePath: stringValue(body.sourcePath),
      tags: stringArray(body.tags),
      idempotencyKey: stringValue(body.idempotencyKey),
    })
    return Response.json({ ok: true, data, auditEvents: [] }, { status: 201 })
  } catch (error) {
    return memoryErrorResponse(error)
  }
}
