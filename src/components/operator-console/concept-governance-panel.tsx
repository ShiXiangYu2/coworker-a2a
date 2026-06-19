'use client'

import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, PanelShell, StatusBadge } from './ui'

interface ConceptGlossary {
  id: string
  conceptType: string
  name: string
  displayName: string
  description: string
  definition: Record<string, unknown>
  applicableTo: string[]
  relatedConcepts: string[]
  examples: string[]
  status: string
  version: number
  createdBy: string
  createdAt: string
}

const conceptTypeLabels: Record<string, string> = {
  term: '术语',
  risk_classification: '风险分类',
  execution_boundary: '执行边界',
  lifecycle_phase: '生命周期阶段',
  review_criteria: '审查准则',
  policy: '策略',
}

const conceptTypeColors: Record<string, string> = {
  term: 'bg-blue-100 text-blue-700',
  risk_classification: 'bg-rose-100 text-rose-700',
  execution_boundary: 'bg-amber-100 text-amber-700',
  lifecycle_phase: 'bg-emerald-100 text-emerald-700',
  review_criteria: 'bg-purple-100 text-purple-700',
  policy: 'bg-indigo-100 text-indigo-700',
}

export function ConceptGovernancePanel() {
  const [concepts, setConcepts] = useState<ConceptGlossary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState<string>('all')
  const [selectedConcept, setSelectedConcept] = useState<ConceptGlossary | null>(null)

  async function fetchConcepts() {
    try {
      const res = await fetch('/api/concept-governance?limit=100')
      if (res.ok) {
        const data = await res.json()
        setConcepts(data.data ?? [])
      }
    } catch {
      // Optional panel
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchConcepts()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  if (loading) {
    return <LoadingState label="正在读取概念治理..." />
  }

  const filteredConcepts = activeType === 'all'
    ? concepts
    : concepts.filter((c) => c.conceptType === activeType)

  const conceptTypes = [...new Set(concepts.map((c) => c.conceptType))]

  return (
    <PanelShell
      title="概念治理 Concept Governance"
      description="正规化系统中的术语、风险分类、执行边界、阶段定义、审查准则和策略。"
    >
      <div className="space-y-4">
        {/* 摘要统计 */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {conceptTypes.map((type) => (
            <div key={type} className="rounded-md border border-gray-200 bg-white p-2 text-center">
              <div className="text-xs text-gray-500">{conceptTypeLabels[type] ?? type}</div>
              <div className="mt-1 text-lg font-semibold text-gray-950">
                {concepts.filter((c) => c.conceptType === type).length}
              </div>
            </div>
          ))}
        </div>

        {/* 类型筛选器 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveType('all')}
            className={`rounded px-3 py-1 text-xs font-medium ${
              activeType === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            全部 ({concepts.length})
          </button>
          {conceptTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`rounded px-3 py-1 text-xs font-medium ${
                activeType === type
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {conceptTypeLabels[type] ?? type} ({concepts.filter((c) => c.conceptType === type).length})
            </button>
          ))}
        </div>

        {/* 概念列表 */}
        <div className="max-h-96 overflow-y-auto">
          {filteredConcepts.length === 0 ? (
            <EmptyState
              title="暂无概念治理"
              description="当概念和策略数据可用后，这里会展示概念治理内容。"
            />
          ) : (
            <div className="space-y-3">
              {filteredConcepts.map((concept) => (
                <div
                  key={concept.id}
                  className={`rounded-lg border p-4 cursor-pointer transition-all ${
                    selectedConcept?.id === concept.id
                      ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } shadow-sm`}
                  onClick={() => setSelectedConcept(selectedConcept?.id === concept.id ? null : concept)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${conceptTypeColors[concept.conceptType] ?? 'bg-gray-100 text-gray-700'}`}>
                          {conceptTypeLabels[concept.conceptType] ?? concept.conceptType}
                        </span>
                        <StatusBadge status={concept.status} />
                        <span className="text-xs text-gray-500">v{concept.version}</span>
                      </div>
                      <div className="mt-2 break-words text-sm font-medium text-gray-900">
                        {concept.displayName}
                      </div>
                      <div className="mt-1 break-words text-sm text-gray-600">
                        {concept.description}
                      </div>
                      {concept.applicableTo.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {concept.applicableTo.map((a, i) => (
                            <span key={i} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 展开详情 */}
                  {selectedConcept?.id === concept.id && (
                    <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
                      {Object.keys(concept.definition).length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-500">定义：</div>
                          <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-700">
                            {JSON.stringify(concept.definition, null, 2)}
                          </pre>
                        </div>
                      )}
                      {concept.examples.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-500">示例：</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {concept.examples.map((e, i) => (
                              <span key={i} className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                                {e}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {concept.relatedConcepts.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-500">相关概念：</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {concept.relatedConcepts.map((r, i) => (
                              <span key={i} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        创建者：{concept.createdBy} / {new Date(concept.createdAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PanelShell>
  )
}
