import { sprint10SafetyNote } from '@/lib/production-security/types'

export function ProductionSecurityCard() {
  return (
    <section className="border-b bg-slate-50 px-4 py-3 text-sm text-slate-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Production Security</span>
          <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200">
            Sprint 10
          </span>
        </div>
        <div className="text-xs font-medium text-slate-700">{sprint10SafetyNote}</div>
        <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-900 sm:grid-cols-3">
          <a className="font-medium hover:text-slate-950" href="/api/security/effective-policy" target="_blank" rel="noreferrer">
            View Security Boundary
          </a>
          <a className="font-medium hover:text-slate-950" href="/api/agent-profiles/claude_ceo/permission-boundary" target="_blank" rel="noreferrer">
            View Permission Boundary
          </a>
          <a className="font-medium hover:text-slate-950" href="/api/release-readiness" target="_blank" rel="noreferrer">
            View Production Checklist
          </a>
          <a className="font-medium hover:text-slate-950" href="/api/regression-gates" target="_blank" rel="noreferrer">
            View Regression Gate
          </a>
          <a className="font-medium hover:text-slate-950" href="/api/agent-profiles" target="_blank" rel="noreferrer">
            View Agent Profile
          </a>
          <a className="font-medium hover:text-slate-950" href="/api/auth-boundary" target="_blank" rel="noreferrer">
            View Auth Boundary
          </a>
          <a className="font-medium hover:text-slate-950" href="/api/production-observability/policy" target="_blank" rel="noreferrer">
            View Audit Policy
          </a>
          <a className="font-medium hover:text-slate-950" href="/api/production-observability/redaction-policy" target="_blank" rel="noreferrer">
            View Redaction Policy
          </a>
        </div>
      </div>
    </section>
  )
}
