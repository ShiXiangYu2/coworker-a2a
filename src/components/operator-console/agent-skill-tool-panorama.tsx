'use client'

import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, PanelShell, StatusBadge } from './ui'

interface AgentInfo {
  id: string
  name: string
  title: string
  description: string
  responsibilities: string[]
  skills: string[]
  stats: {
    totalRuns: number
    successRate: number
    avgDurationMs: number
    commonErrors: string[]
  }
}

interface SkillInfo {
  id: string
  name: string
  description: string
  phase: string
  inputSchema?: string
  outputSchema?: string
  usageCount: number
  promptFile?: string
}

interface ToolInfo {
  id: string
  name: string
  category: string
  riskLevel: string
  usageCount: number
  successRate: number
}

interface PanoramaData {
  agents: AgentInfo[]
  skills: SkillInfo[]
  tools: ToolInfo[]
  summary: {
    totalAgents: number
    totalSkills: number
    totalTools: number
    avgSuccessRate: number
  }
}

const phaseColors: Record<string, string> = {
  intake: 'bg-blue-100 text-blue-700',
  consensus: 'bg-indigo-100 text-indigo-700',
  planning: 'bg-purple-100 text-purple-700',
  execution: 'bg-amber-100 text-amber-700',
  review: 'bg-emerald-100 text-emerald-700',
  repair: 'bg-rose-100 text-rose-700',
}

const riskLevelColors: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-rose-100 text-rose-700',
}

export function AgentSkillToolPanorama() {
  const [data, setData] = useState<PanoramaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'agents' | 'skills' | 'tools'>('agents')

  async function fetchPanoramaData() {
    try {
      const res = await fetch('/api/operator/panorama')
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
      void fetchPanoramaData()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  if (loading) {
    return <LoadingState label="正在加载机器全景..." />
  }

  if (!data) {
    return (
      <PanelShell
        title="机器全景 Agent-Skill-Tool Panorama"
        description="展示所有 Agent、Skill 和 Tool 的全貌，包括职责、能力和使用统计。"
      >
        <EmptyState
          title="暂无机器全景数据"
          description="当 Agent、Skill 和 Tool 数据可用后，这里会展示完整的机器全景。"
        />
      </PanelShell>
    )
  }

  return (
    <PanelShell
      title="机器全景 Agent-Skill-Tool Panorama"
      description="展示所有 Agent、Skill 和 Tool 的全貌，包括职责、能力和使用统计。"
    >
      <div className="space-y-4">
        {/* 摘要统计 */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
            <div className="text-xs text-gray-500">Agent 总数</div>
            <div className="mt-1 text-xl font-semibold text-gray-950">{data.summary.totalAgents}</div>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
            <div className="text-xs text-gray-500">Skill 总数</div>
            <div className="mt-1 text-xl font-semibold text-gray-950">{data.summary.totalSkills}</div>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
            <div className="text-xs text-gray-500">Tool 总数</div>
            <div className="mt-1 text-xl font-semibold text-gray-950">{data.summary.totalTools}</div>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3 text-center">
            <div className="text-xs text-gray-500">平均成功率</div>
            <div className="mt-1 text-xl font-semibold text-emerald-600">
              {(data.summary.avgSuccessRate * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* 标签页切换 */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('agents')}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'agents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Agent 全景 ({data.agents.length})
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'skills'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Skill 全景 ({data.skills.length})
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'tools'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Tool 全景 ({data.tools.length})
          </button>
        </div>

        {/* Agent 全景 */}
        {activeTab === 'agents' && (
          <div className="space-y-3">
            {data.agents.length === 0 ? (
              <EmptyState title="暂无 Agent" description="当 Agent 数据可用后，这里会展示 Agent 全景。" />
            ) : (
              data.agents.map((agent) => (
                <div key={agent.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{agent.name}</h3>
                        <StatusBadge status="active" />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{agent.title}</p>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">
                        运行 {agent.stats.totalRuns} 次
                      </span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-600">
                        成功率 {(agent.stats.successRate * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{agent.description}</p>
                  <div className="mt-3">
                    <div className="text-xs font-medium text-gray-500">职责：</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {agent.responsibilities.map((r, i) => (
                        <span key={i} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs font-medium text-gray-500">技能：</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {agent.skills.map((s, i) => (
                        <span key={i} className="rounded bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  {agent.stats.commonErrors.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-gray-500">常见错误：</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {agent.stats.commonErrors.map((e, i) => (
                          <span key={i} className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Skill 全景 */}
        {activeTab === 'skills' && (
          <div className="space-y-3">
            {data.skills.length === 0 ? (
              <EmptyState title="暂无 Skill" description="当 Skill 数据可用后，这里会展示 Skill 全景。" />
            ) : (
              data.skills.map((skill) => (
                <div key={skill.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{skill.name}</h3>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${phaseColors[skill.phase] ?? 'bg-gray-100 text-gray-700'}`}>
                          {skill.phase}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{skill.description}</p>
                    </div>
                    <div className="text-xs">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">
                        使用 {skill.usageCount} 次
                      </span>
                    </div>
                  </div>
                  {skill.inputSchema && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-gray-500">输入：</div>
                      <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-700">
                        {skill.inputSchema}
                      </pre>
                    </div>
                  )}
                  {skill.outputSchema && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-gray-500">输出：</div>
                      <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-700">
                        {skill.outputSchema}
                      </pre>
                    </div>
                  )}
                  {skill.promptFile && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-gray-500">Prompt 文件：</div>
                      <span className="mt-1 text-xs text-blue-600">{skill.promptFile}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tool 全景 */}
        {activeTab === 'tools' && (
          <div className="space-y-3">
            {data.tools.length === 0 ? (
              <EmptyState title="暂无 Tool" description="当 Tool 数据可用后，这里会展示 Tool 全景。" />
            ) : (
              data.tools.map((tool) => (
                <div key={tool.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{tool.name}</h3>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${riskLevelColors[tool.riskLevel] ?? 'bg-gray-100 text-gray-700'}`}>
                          {tool.riskLevel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{tool.category}</p>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">
                        使用 {tool.usageCount} 次
                      </span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-600">
                        成功率 {(tool.successRate * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </PanelShell>
  )
}
