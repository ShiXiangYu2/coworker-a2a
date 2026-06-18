'use client'

import { useCallback, useEffect, useState } from 'react'

interface Message {
  id: string
  role: string
  content: string
  createdAt: string
}

interface FlowStep {
  type: 'decomposition' | 'agent_result' | 'summary'
  agentId?: string
  agentName?: string
  title?: string
  summary?: string
  confidence?: number
  status?: string
  findings?: string[]
}

const agentColors: Record<string, string> = {
  jobs: 'border-blue-300 bg-blue-50',
  linus: 'border-green-300 bg-green-50',
  turing: 'border-purple-300 bg-purple-50',
  bezos: 'border-orange-300 bg-orange-50',
}

const agentLabels: Record<string, string> = {
  jobs: 'Jobs',
  linus: 'Linus',
  turing: 'Turing',
  bezos: 'Bezos',
}

export function MultiAgentFlow() {
  const [flows, setFlows] = useState<{ reasoning: string; steps: FlowStep[] }[]>([])
  const [loading, setLoading] = useState(true)

  const extractSteps = useCallback((content: string): FlowStep[] => {
    const steps: FlowStep[] = []
    const agentPattern = /(?:Jobs|Linus|Turing|Bezos)\s*\((\w+)\)/g
    let match
    while ((match = agentPattern.exec(content)) !== null) {
      const agentId = match[1].toLowerCase()
      steps.push({
        type: 'agent_result',
        agentId,
        agentName: match[0].split('(')[0].trim(),
        summary: content.slice(match.index, Math.min(match.index + 100, content.length)),
        status: 'completed',
      })
    }
    return steps
  }, [])

  const fetchAndParse = useCallback(async () => {
    try {
      // 获取最近的对话消息，查找包含多 Agent 事件的
      const convRes = await fetch('/api/conversations')
      if (!convRes.ok) return
      const conversations = await convRes.json()

      const parsedFlows: { reasoning: string; steps: FlowStep[] }[] = []

      // 只检查最近 5 个对话
      for (const conv of (conversations ?? []).slice(0, 5)) {
        const msgRes = await fetch(`/api/conversations/${conv.id}/messages`)
        if (!msgRes.ok) continue
        const messages: Message[] = await msgRes.json()

        for (const msg of messages) {
          if (msg.role !== 'assistant') continue
          // 查找包含 multi-agent 标记的内容
          if (msg.content.includes('Multi-Agent') || msg.content.includes('多 Agent') || msg.content.includes('协作分析')) {
            // 尝试从内容中提取结构
            const steps = extractSteps(msg.content)
            if (steps.length > 0) {
              parsedFlows.push({
                reasoning: msg.content.slice(0, 100) + '...',
                steps,
              })
            }
          }
        }
      }

      setFlows(parsedFlows.slice(0, 5))
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [extractSteps])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchAndParse()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [fetchAndParse])

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="animate-pulse text-sm text-gray-500">Loading multi-agent flows...</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">协作流</h2>
        <p className="text-xs text-gray-500">{flows.length} 条最近协作记录</p>
      </div>

      <div className="max-h-96 overflow-y-auto p-4">
        {flows.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No multi-agent flows recorded yet.
            <br />
            <span className="text-xs text-gray-400">
              Try: &quot;帮我分析这个功能的 PRD 和技术方案&quot;
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {flows.map((flow, idx) => (
              <div key={idx} className="rounded-lg border p-3">
                <div className="mb-2 text-xs font-medium text-gray-500">Flow #{idx + 1}</div>
                <div className="mb-3 text-sm text-gray-700">{flow.reasoning}</div>
                <div className="flex flex-wrap gap-2">
                  {flow.steps.map((step, sIdx) => (
                    <div
                      key={sIdx}
                      className={`rounded-lg border-2 px-3 py-2 text-xs ${agentColors[step.agentId ?? ''] ?? 'border-gray-200 bg-gray-50'}`}
                    >
                      <div className="font-semibold">
                        {agentLabels[step.agentId ?? ''] ?? step.agentName ?? step.agentId}
                      </div>
                      {step.summary && (
                        <div className="mt-1 max-w-48 truncate text-gray-600">{step.summary}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
