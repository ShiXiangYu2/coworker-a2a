'use client'

/**
 * HARNESS Governance Ledger — 治理台账视图
 *
 * 展示治理相关记录：
 * - 判断记录（为什么做出某个选择）
 * - 债务登记（系统问题和债务）
 * - 审计日志（关键操作记录）
 * - 评估结果（质量评估）
 */

import { useState, useEffect } from 'react'

interface GovernanceData {
  judgments: Array<{
    id: string
    type: string
    targetType: string
    targetId: string
    reason: string
    status: string
    createdAt: string
  }>
  debts: Array<{
    id: string
    type: string
    severity: string
    title: string
    status: string
    blocksExecution: boolean
    createdAt: string
  }>
  recentAudits: Array<{
    id: string
    eventType: string
    actorId: string
    reason: string
    createdAt: string
  }>
  evalSummary: {
    totalRuns: number
    passRate: number
    recentFindings: number
  }
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

export function HarnessGovernance() {
  const [data, setData] = useState<GovernanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'judgments' | 'debts' | 'audits'>('judgments')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await fetch('/api/operator/harness-governance')
      const json = await res.json()
      if (json.ok) setData(json.data)
    } catch {
      setData({
        judgments: [],
        debts: [],
        recentAudits: [],
        evalSummary: { totalRuns: 0, passRate: 0, recentFindings: 0 },
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-6 text-gray-500">Loading governance ledger...</div>

  return (
    <div className="space-y-6">
      {/* 评估摘要 */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">📊 评估摘要</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-500">总评估次数</div>
            <div className="text-xl font-bold">{data?.evalSummary.totalRuns ?? 0}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">通过率</div>
            <div className="text-xl font-bold">
              {((data?.evalSummary.passRate ?? 0) * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">最近发现</div>
            <div className="text-xl font-bold">{data?.evalSummary.recentFindings ?? 0}</div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="bg-white rounded-lg border">
        <div className="flex border-b">
          {(['judgments', 'debts', 'audits'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium transition ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'judgments' && '🧠 判断记录'}
              {tab === 'debts' && '📋 债务登记'}
              {tab === 'audits' && '📝 审计日志'}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'judgments' && (
            <div className="space-y-3">
              {data?.judgments.length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-4">暂无判断记录</div>
              ) : (
                data?.judgments.map((j) => (
                  <div key={j.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {j.type}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="text-gray-600">{j.targetType}</span>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
                        j.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {j.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{j.reason.slice(0, 100)}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(j.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'debts' && (
            <div className="space-y-3">
              {data?.debts.length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-4">暂无债务登记 ✨</div>
              ) : (
                data?.debts.map((d) => (
                  <div key={d.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`text-xs px-2 py-0.5 rounded ${SEVERITY_COLORS[d.severity]}`}>
                        {d.severity}
                      </span>
                      <span className="font-medium flex-1">{d.title}</span>
                      {d.blocksExecution && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                          阻塞执行
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      类型: {d.type} | 状态: {d.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'audits' && (
            <div className="space-y-2">
              {data?.recentAudits.length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-4">暂无审计日志</div>
              ) : (
                data?.recentAudits.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 text-sm border-b pb-2">
                    <span className="text-gray-400 w-16 shrink-0 text-xs">
                      {new Date(a.createdAt).toLocaleTimeString('zh-CN')}
                    </span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {a.eventType}
                    </span>
                    <span className="text-gray-600 flex-1">{a.reason.slice(0, 80)}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
