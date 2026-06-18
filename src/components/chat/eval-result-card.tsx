import type { EvalRunBundle } from '@/lib/eval/types'
import { sprint7SafetyNote } from '@/lib/eval/types'
import { sprint10SafetyNote } from '@/lib/production-security/types'

interface EvalResultCardProps {
  bundles: EvalRunBundle[]
}

export function EvalResultCard({ bundles }: EvalResultCardProps) {
  if (bundles.length === 0) return null

  return (
    <section className="border-b bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Verification</span>
          <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            {bundles.length} local eval records
          </span>
        </div>
        <div className="text-xs font-medium text-amber-700">{sprint7SafetyNote}</div>
        <div className="text-xs font-medium text-slate-700">{sprint10SafetyNote}</div>

        <div className="space-y-2">
          {bundles.map(({ evalRun, evalTarget, findings }) => (
            <div key={evalRun.id} className="rounded-md border border-amber-200 bg-white p-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{evalTarget.targetType}</span>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                  {evalRun.status}
                </span>
                {evalRun.qualityGateDecision && (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    {evalRun.qualityGateDecision.decision}
                  </span>
                )}
              </div>
              <div className="mt-1 text-amber-900">
                {evalRun.qualityGateDecision?.summary ?? 'Verification record created.'}
              </div>
              {findings.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-800">
                  {findings.slice(0, 4).map((finding) => (
                    <li key={finding.id}>
                      {finding.severity}: {finding.title}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <a
                  href="/api/security/effective-policy"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-white px-3 py-1.5 font-medium text-amber-900 ring-1 ring-amber-200 hover:bg-amber-50"
                >
                  View Permission Boundary
                </a>
                <a
                  href={`/api/eval-runs/${evalRun.id}/quality-gate`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-white px-3 py-1.5 font-medium text-amber-900 ring-1 ring-amber-200 hover:bg-amber-50"
                >
                  View Regression Coverage
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
