import { readToolSandboxes } from '@/lib/tools/repository'

export async function GET() {
  return Response.json({ ok: true, data: readToolSandboxes() })
}
