'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Deliverable } from '@/lib/agents/types'

const TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  document: { label: '文档', color: 'bg-blue-100 text-blue-800', icon: '📄' },
  code: { label: '代码', color: 'bg-green-100 text-green-800', icon: '💻' },
  analysis: { label: '分析', color: 'bg-purple-100 text-purple-800', icon: '🔍' },
  report: { label: '报告', color: 'bg-orange-100 text-orange-800', icon: '📊' },
  plan: { label: '方案', color: 'bg-cyan-100 text-cyan-800', icon: '📋' },
}

interface DeliverableCardProps {
  deliverables: Deliverable[]
  agentName: string
  summary: string
  confidence: number
}

export function DeliverableCard({ deliverables, agentName, summary, confidence }: DeliverableCardProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0)
  const [copied, setCopied] = useState(false)

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = (title: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-zA-Z0-9一-龥]/g, '_')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (deliverables.length === 0) return null

  return (
    <div className="mx-4 mb-3 rounded-lg border border-amber-200 bg-amber-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-200 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">📦</span>
          <span className="text-sm font-semibold text-amber-900">
            {agentName} 产出了 {deliverables.length} 个交付物
          </span>
        </div>
        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs text-amber-800">
          置信度 {(confidence * 100).toFixed(0)}%
        </span>
      </div>

      {/* Summary */}
      <div className="border-b border-amber-100 px-4 py-2 text-sm text-amber-800">
        {summary}
      </div>

      {/* Deliverable tabs */}
      {deliverables.length > 1 && (
        <div className="flex gap-1 border-b border-amber-100 px-4 pt-2">
          {deliverables.map((d, i) => {
            const meta = TYPE_LABELS[d.type] ?? TYPE_LABELS.analysis
            return (
              <button
                key={i}
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                className={`rounded-t-md px-3 py-1 text-xs font-medium transition-colors ${
                  expandedIdx === i
                    ? 'bg-amber-200 text-amber-900'
                    : 'text-amber-600 hover:bg-amber-100'
                }`}
              >
                {meta.icon} {meta.label}: {d.title.slice(0, 20)}
              </button>
            )
          })}
        </div>
      )}

      {/* Expanded content */}
      {expandedIdx !== null && deliverables[expandedIdx] && (
        <div className="px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(() => {
                const meta = TYPE_LABELS[deliverables[expandedIdx].type] ?? TYPE_LABELS.analysis
                return (
                  <>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
                      {meta.icon} {meta.label}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {deliverables[expandedIdx].title}
                    </span>
                  </>
                )
              })()}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleCopy(deliverables[expandedIdx].content)}
                className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                {copied ? '✓ 已复制' : '📋 复制'}
              </button>
              <button
                onClick={() => handleDownload(deliverables[expandedIdx].title, deliverables[expandedIdx].content)}
                className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                ⬇ 下载
              </button>
            </div>
          </div>

          {/* Markdown content */}
          <div className="prose prose-sm max-w-none rounded-md border bg-white p-3">
            <ReactMarkdown>{deliverables[expandedIdx].content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
