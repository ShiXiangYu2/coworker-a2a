'use client'

import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, PanelShell, StatusBadge } from './ui'

interface ExperienceItem {
  id: string
  kind: string
  kindLabel: string
  title: string
  content: string
  scope: string
  version: number
  createdBy: string
  createdAt: string
}

interface ExperienceStats {
  type: string
  label: string
  count: number
}

interface ExperienceData {
  items: ExperienceItem[]
  stats: ExperienceStats[]
  total: number
}

const kindColors: Record<string, string> = {
  workflow_template: 'bg-blue-100 text-blue-700',
  execution_plan: 'bg-purple-100 text-purple-700',
  judgment_pattern: 'bg-amber-100 text-amber-700',
  resolved_debt_case: 'bg-emerald-100 text-emerald-700',
  failure_pattern: 'bg-rose-100 text-rose-700',
  evidence_snapshot: 'bg-indigo-100 text-indigo-700',
  system_experience: 'bg-gray-100 text-gray-700',
}

export function SystemExperiencePanel() {
  const [data, setData] = useState<ExperienceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<ExperienceItem | null>(null)

  async function fetchExperience() {
    try {
      const res = await fetch('/api/system-experience?limit=50')
      if (res.ok) {
        const result = await res.json()
        if (result.ok) {
          setData(result.data)
        }
      }
    } catch {
      // Optional panel
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchExperience()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  if (loading) {
    return <LoadingState label="正在加载系统经验..." />
  }

  if (!data) {
    return (
      <PanelShell
        title="系统经验层 System Experience"
        description="沉淀高质量的 workflow 模板、执行计划、判断模式、失败案例等系统经验。"
      >
        <EmptyState
          title="暂无系统经验"
          description="当系统积累足够经验后，这里会展示系统经验内容。"
        />
      </PanelShell>
    )
  }

  const filteredItems = activeType === 'all'
    ? data.items
    : data.items.filter((item) => item.kind === activeType)

  return (
    <PanelShell
      title="系统经验层 System Experience"
      description="沉淀高质量的 workflow 模板、执行计划、判断模式、失败案例等系统经验。"
    >
      <div className="space-y-4">
        {/* 统计摘要 */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {data.stats.map((stat) => (
            <div key={stat.type} className="rounded-md border border-gray-200 bg-white p-2 text-center">
              <div className="text-xs text-gray-500">{stat.label}</div>
              <div className="mt-1 text-lg font-semibold text-gray-950">{stat.count}</div>
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
            全部 ({data.total})
          </button>
          {data.stats.filter((s) => s.count > 0).map((stat) => (
            <button
              key={stat.type}
              onClick={() => setActiveType(stat.type)}
              className={`rounded px-3 py-1 text-xs font-medium ${
                activeType === stat.type
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {stat.label} ({stat.count})
            </button>
          ))}
        </div>

        {/* 经验列表 */}
        <div className="max-h-96 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <EmptyState
              title="暂无系统经验"
              description="当系统积累足够经验后，这里会展示系统经验内容。"
            />
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border p-4 cursor-pointer transition-all ${
                    selectedItem?.id === item.id
                      ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } shadow-sm`}
                  onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${kindColors[item.kind] ?? 'bg-gray-100 text-gray-700'}`}>
                          {item.kindLabel}
                        </span>
                        <StatusBadge status="approved" />
                        <span className="text-xs text-gray-500">v{item.version}</span>
                      </div>
                      <div className="mt-2 break-words text-sm font-medium text-gray-900">
                        {item.title}
                      </div>
                      <div className="mt-1 break-words text-sm text-gray-600 line-clamp-2">
                        {item.content}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        作用域：{item.scope} / 创建者：{item.createdBy} / {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* 展开详情 */}
                  {selectedItem?.id === item.id && (
                    <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
                      <div>
                        <div className="text-xs font-medium text-gray-500">内容：</div>
                        <div className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-700">
                          {item.content}
                        </div>
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
