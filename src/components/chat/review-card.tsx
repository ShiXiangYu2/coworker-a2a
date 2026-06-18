'use client'

import type { AgentReview } from '@/lib/agents/types'

const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  approve: {
    label: '审查通过',
    color: 'text-green-800',
    bg: 'bg-green-50 border-green-200',
    icon: '✓',
  },
  request_changes: {
    label: '需要修改',
    color: 'text-yellow-800',
    bg: 'bg-yellow-50 border-yellow-200',
    icon: '⚠',
  },
  reject: {
    label: '审查未通过',
    color: 'text-red-800',
    bg: 'bg-red-50 border-red-200',
    icon: '✗',
  },
}

interface ReviewCardProps {
  review: AgentReview
}

export function ReviewCard({ review }: ReviewCardProps) {
  const config = VERDICT_CONFIG[review.verdict] ?? VERDICT_CONFIG.approve

  return (
    <div className={`mx-4 mb-2 rounded-lg border ${config.bg}`}>
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <span className={`text-lg ${config.color}`}>{config.icon}</span>
          <span className={`text-sm font-semibold ${config.color}`}>
            Turing 审查：{config.label}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          置信度 {(review.confidence * 100).toFixed(0)}%
        </span>
      </div>

      <div className="border-t border-gray-100 px-4 py-2">
        <p className="text-sm text-gray-700">{review.summary}</p>

        {review.findings.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-gray-600">发现的问题：</p>
            <ul className="mt-1 list-inside list-disc text-xs text-gray-600">
              {review.findings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        {review.suggestions.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-gray-600">改进建议：</p>
            <ul className="mt-1 list-inside list-disc text-xs text-gray-600">
              {review.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
