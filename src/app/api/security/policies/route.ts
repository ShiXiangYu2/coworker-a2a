import { listSecurityPolicies } from '@/lib/production-security/repository'

export async function GET() {
  return Response.json({ ok: true, data: listSecurityPolicies() })
}
