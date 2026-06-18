import { getApiRoles } from '@/lib/production-security/repository'

export async function GET() {
  return Response.json({ ok: true, data: getApiRoles() })
}
