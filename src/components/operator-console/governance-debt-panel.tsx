'use client'

import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, PanelShell, RecordMeta, StatusBadge } from './ui'

interface GovernanceDebt {
  id: string
  debtType: string
  severity: string
  title: string
  description: string
  source: string
  evidence: string[]
  blocksExecution: boolean
  status: string
  resolution?: string
  createdBy: string
  createdAt: string
}

interface DebtStats {
  total: number
  open: number
  blocking: number
  bySeverity: Record<string, number>
  byType: Record<string, number>
}

const debtTypeLabels: Record<string, string> = {
  drift: '漂移问题',
  tool_permission_gap: '工具权限缺口',
  rule_inconsistency: '规则不一致',
  prompt_quality: '提示词质量问题',
  execution_reliability: '执行可靠性问题',
  evidence_gap: '证据不足问题',
}

const severityColors: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-rose-100 text-rose-700',
}

const severityOrder: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

export function GovernanceDebtPanel() {
  const [debts, setDebts] = useState<GovernanceDebt[]>([])
  const [stats, setStats] = useState<DebtStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  async function fetchData() {
    try {
      const [debtsRes, statsRes] = await Promise.all([
        fetch('/api/governance-debts?status=open&limit=20'),
        fetch('/api/governance-debts?stats=true'),
      ])

      if (debtsRes.ok) {
        const data = await debtsRes.json()
        setDebts(data.data ?? [])
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.data)
      }
    } catch {
      // Optional panel
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchData()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  if (loading) {
    return <LoadingState label="正在读取治理债务..." />
  }

  const filteredDebts = filter === 'all'
    ? debts
    : filter === 'blocking'
      ? debts.filter((d) => d.blocksExecution)
      : debts.filter((d) => d.severity === filter)

  return (
    <PanelShell
      title="治理债务登记 Governance Debt"
      description="统一记录系统中的问题和债务，包括漂移、权限缺口、规则不一致等。"
    >
      <div className="space-y-4">
        {/* 统计摘要 */}
        {stats && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
              <div className="text-xs text-gray-500">总债务数</div>
              <div className="mt-1 text-xl font-semibold text-gray-950">{stats.total}</div>
            </div>
            <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
              <div className="text-xs text-gray-500">待解决</div>
              <div className="mt-1 text-xl font-semibold text-amber-600">{stats.open}</div>
            </div>
            <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
              <div className="text-xs text-gray-500">阻塞执行</div>
              <div className="mt-1 text-xl font-semibold text-rose-600">{stats.blocking}</div>
            </div>
            <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
              <div className="text-xs text-gray-500">严重度分布</div>
              <div className="mt-1 flex justify-center gap-1">
                {Object.entries(stats.bySeverity).map(([severity, count]) => (
                  <span
                    key={severity}
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${severityColors[severity] ?? 'bg-gray-100 text-gray-700'}`}
                  >
                    {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 筛选器 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded px-3 py-1 text-xs font-medium ${
              filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            全部 ({debts.length})
          </button>
          <button
            onClick={() => setFilter('blocking')}
            className={`rounded px-3 py-1 text-xs font-medium ${
              filter === 'blocking' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
            }`}
          >
            阻塞执行 ({debts.filter((d) => d.blocksExecution).length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`rounded px-3 py-1 text-xs font-medium ${
              filter === 'critical' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
            }`}
          >
            严重 ({debts.filter((d) => d.severity === 'critical').length})
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`rounded px-3 py-1 text-xs font-medium ${
              filter === 'high' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
            }`}
          >
            高 ({debts.filter((d) => d.severity === 'high').length})
          </button>
        </div>

        {/* 债务列表 */}
        <div className="max-h-96 overflow-y-auto">
          {filteredDebts.length === 0 ? (
            <EmptyState
              title="暂无治理债务"
              description="当系统检测到问题时，这里会展示治理债务记录。"
            />
          ) : (
            <div className="space-y-3">
              {filteredDebts.map((debt) => (
                <div
                  key={debt.id}
                  className={`rounded-lg border p-4 ${
                    debt.blocksExecution
                      ? 'border-rose-200 bg-rose-50'
                      : 'border-gray-200 bg-white'
                  } shadow-sm`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${severityColors[debt.severity]}`}>
                          {debt.severity}
                        </span>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {debtTypeLabels[debt.debtType] ?? debt.debtType}
                        </span>
                        <StatusBadge status={debt.status} />
                        {debt.blocksExecution && (
                          <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                            阻塞执行
                          </span>
                        )}
                      </div>
                      <div className="mt-2 break-words text-sm font-medium text-gray-900">
                        {debt.title}
                      </div>
                      <div className="mt-1 break-words text-sm text-gray-600">
                        {debt.description}
                      </div>
                      {debt.evidence.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {debt.evidence.map((e, i) => (
                            <span
                              key={i}
                              className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                      )}
                      <RecordMeta>
                        来源：{debt.source} / 创建者：{debt.createdBy} / {new Date(debt.createdAt).toLocaleString()}
                      </RecordMeta>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PanelShell>
  )
}
